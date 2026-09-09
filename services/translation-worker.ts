import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, lt, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  translationAiInvocations,
  translationAiModels,
  translationCharacters,
  translationChapters,
  translationContextSnapshots,
  translationGlossaryEntries,
  translationJobItems,
  translationJobs,
  translationProfiles,
  translationProfileVersions,
  translationPromptVersions,
  translationQaIssues,
  translationSourceSnapshots,
  translationVersions,
  translationWorkspaces,
} from "@/db/schema";
import { estimateTokens, sha256 } from "@/lib/domain/translation";
import { automaticModelNameForTask, type AutomaticTranslationTask } from "@/lib/domain/translation-ai-routing";
import { logger } from "@/lib/logger";
import { aiCallCostMicros, analyzeChapterWithAi, qaTranslationWithAi, reviseTranslationWithAi, type AiCallRecord } from "@/services/ai/translation-pipeline";
import { getTranslationProvider } from "@/services/ai/translation-provider";
import { insertTranslationVersion, replaceQaIssues } from "@/services/translation-version-service";

const workerLogger = logger.child({ component: "translation-worker" });
const MAX_ATTEMPTS = 3;

type ClaimedItem = {
  item: typeof translationJobItems.$inferSelect;
  job: typeof translationJobs.$inferSelect;
};

function safeError(error: unknown) {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 1_000);
  return "Unknown translation provider error";
}

async function claimNextItem(): Promise<ClaimedItem | null> {
  return getDb().transaction(async (tx) => {
    const [row] = await tx.select({ item: translationJobItems, job: translationJobs })
      .from(translationJobItems)
      .innerJoin(translationJobs, eq(translationJobs.id, translationJobItems.jobId))
      .where(and(
        eq(translationJobItems.status, "QUEUED"),
        lte(translationJobItems.availableAt, new Date()),
        inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
        isNull(translationJobs.cancelRequestedAt),
      ))
      .orderBy(asc(translationJobItems.availableAt), asc(translationJobItems.id))
      .limit(1)
      .for("update", { skipLocked: true });
    if (!row) return null;
    const now = new Date();
    const [item] = await tx.update(translationJobItems).set({ status: "RUNNING", progressPercent: 10, progressStage: "CONTEXT", attempts: row.item.attempts + 1, startedAt: now, lastError: null })
      .where(and(eq(translationJobItems.id, row.item.id), eq(translationJobItems.status, "QUEUED"))).returning();
    if (!item) return null;
    const [job] = await tx.update(translationJobs).set({ status: "RUNNING", startedAt: row.job.startedAt ?? now, updatedAt: now })
      .where(eq(translationJobs.id, row.job.id)).returning();
    await tx.update(translationChapters).set({ status: "TRANSLATING", updatedAt: now }).where(eq(translationChapters.id, item.translationChapterId));
    return { item, job };
  });
}

async function buildContext(job: typeof translationJobs.$inferSelect, translationChapterId: string, sourceSnapshotId: string) {
  const db = getDb();
  const [row] = await db.select({
    chapter: translationChapters,
    source: translationSourceSnapshots,
    workspace: translationWorkspaces,
    profile: translationProfiles,
  }).from(translationChapters)
    .innerJoin(translationSourceSnapshots, and(
      eq(translationSourceSnapshots.id, sourceSnapshotId),
      eq(translationSourceSnapshots.workspaceId, translationChapters.workspaceId),
      eq(translationSourceSnapshots.importChapterId, translationChapters.importChapterId),
    ))
    .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationChapters.workspaceId))
    .innerJoin(translationProfiles, eq(translationProfiles.workspaceId, translationWorkspaces.id))
    .where(and(eq(translationChapters.id, translationChapterId), eq(translationChapters.workspaceId, job.workspaceId), eq(translationSourceSnapshots.id, sourceSnapshotId))).limit(1);
  if (!row) throw new Error("Translation chapter is no longer available");

  const [allTerms, allCharacters, previousApproved, profileVersionRows] = await Promise.all([
    db.select().from(translationGlossaryEntries).where(and(eq(translationGlossaryEntries.workspaceId, job.workspaceId), eq(translationGlossaryEntries.isLocked, true))),
    db.select().from(translationCharacters).where(and(eq(translationCharacters.workspaceId, job.workspaceId), eq(translationCharacters.isLocked, true))),
    db.select({ chapterNumber: translationChapters.chapterNumber, title: translationVersions.title, content: translationVersions.content })
      .from(translationVersions)
      .innerJoin(translationChapters, eq(translationChapters.id, translationVersions.translationChapterId))
      .where(and(
        eq(translationChapters.workspaceId, job.workspaceId),
        lt(translationChapters.chapterNumber, row.chapter.chapterNumber),
        inArray(translationVersions.status, ["APPROVED", "PUBLISHED"]),
      ))
      .orderBy(desc(translationChapters.chapterNumber), desc(translationVersions.revision))
      .limit(2),
    db.select({ snapshot: translationProfileVersions.snapshot }).from(translationProfileVersions).where(and(
      eq(translationProfileVersions.workspaceId, job.workspaceId),
      sql`${translationProfileVersions.snapshot} ? 'analysis'`,
    )).orderBy(desc(translationProfileVersions.version)).limit(1),
  ]);

  const haystack = `${row.source.title ?? ""}\n${row.source.content}`.toLocaleLowerCase();
  const relevantTerms = allTerms.filter((entry) => haystack.includes(entry.sourceTerm.toLocaleLowerCase())).map((entry) => ({ source: entry.sourceTerm, target: entry.targetTerm, note: entry.note }));
  const relevantCharacters = allCharacters.filter((character) => {
    const names = [character.sourceName, ...character.aliases];
    return names.some((name) => haystack.includes(name.toLocaleLowerCase()));
  }).map((character) => ({ sourceName: character.sourceName, targetName: character.targetName, description: character.description, speakingStyle: character.speakingStyle }));

  const context = {
    sourceSnapshotId: row.source.id,
    sourceHash: row.source.sourceHash,
    sourceLanguage: row.workspace.sourceLanguage,
    targetLanguage: row.workspace.targetLanguage,
    chapterNumber: row.chapter.chapterNumber,
    profile: {
      name: row.profile.name,
      styleGuide: row.profile.styleGuide,
      instructions: row.profile.instructions,
      preserveParagraphs: row.profile.preserveParagraphs,
    },
    genreContext: (() => {
      const snapshot = profileVersionRows[0]?.snapshot;
      if (!snapshot || typeof snapshot !== "object") return null;
      const analysis = snapshot.analysis;
      if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) return null;
      return "genreContext" in analysis ? analysis.genreContext : null;
    })(),
    glossary: relevantTerms,
    characters: relevantCharacters,
    previousApproved: previousApproved.map((entry) => ({ chapterNumber: entry.chapterNumber, title: entry.title, ending: entry.content.slice(-4_000) })),
  };
  const serialized = JSON.stringify(context);
  const [snapshot] = await db.insert(translationContextSnapshots).values({
    translationChapterId,
    profileVersion: row.profile.version,
    contextHash: sha256(serialized),
    context,
    estimatedTokens: estimateTokens(serialized),
  }).returning();
  return { ...row, context, contextSnapshot: snapshot };
}

async function refreshJob(jobId: string) {
  const db = getDb();
  await db.transaction(async (tx) => {
    const [job] = await tx.select().from(translationJobs).where(eq(translationJobs.id, jobId)).limit(1).for("update");
    if (!job) return;
    const [counts, failedItems] = await Promise.all([
      tx.select({ status: translationJobItems.status, value: count() }).from(translationJobItems).where(eq(translationJobItems.jobId, jobId)).groupBy(translationJobItems.status),
      tx.select({ lastError: translationJobItems.lastError }).from(translationJobItems).where(and(eq(translationJobItems.jobId, jobId), eq(translationJobItems.status, "FAILED"))).orderBy(desc(translationJobItems.finishedAt)).limit(1),
    ]);
    const byStatus = new Map(counts.map((row) => [row.status, Number(row.value)]));
    const queued = (byStatus.get("QUEUED") ?? 0) + (byStatus.get("RUNNING") ?? 0);
    const completed = byStatus.get("COMPLETED") ?? 0;
    const failed = byStatus.get("FAILED") ?? 0;
    const cancelled = byStatus.get("CANCELLED") ?? 0;
    const now = new Date();
    if (queued > 0) {
      await tx.update(translationJobs).set({ status: "RUNNING", completedItems: completed, failedItems: failed, lastError: failedItems[0]?.lastError ?? null, updatedAt: now }).where(eq(translationJobs.id, jobId));
      return;
    }

    const status = cancelled > 0 ? "CANCELLED" : failed > 0 && completed > 0 ? "PARTIAL" : failed > 0 ? "FAILED" : "COMPLETED";
    await tx.update(translationJobs).set({ status, completedItems: completed, failedItems: failed, finishedAt: now, lastError: failedItems[0]?.lastError ?? null, updatedAt: now }).where(eq(translationJobs.id, jobId));

    await tx.update(translationWorkspaces).set({ status: "REVIEW", updatedAt: now }).where(eq(translationWorkspaces.id, job.workspaceId));
  });
}

async function recordStructuredInvocation(jobItemId: string, contextSnapshotId: string, call: AiCallRecord) {
  await getDb().insert(translationAiInvocations).values({
    jobItemId,
    modelId: call.model.id,
    task: call.task,
    contextSnapshotId,
    providerRequestId: call.result.providerRequestId,
    inputTokens: call.result.inputTokens,
    outputTokens: call.result.outputTokens,
    costMicros: aiCallCostMicros(call),
    latencyMs: call.result.latencyMs,
    status: "SUCCESS",
  });
}

function modelForTask(models: Array<typeof translationAiModels.$inferSelect>, task: AutomaticTranslationTask) {
  const model = models.find((candidate) => candidate.modelName === automaticModelNameForTask(task));
  if (!model) throw new Error(`AI model is unavailable for ${task}`);
  return model;
}

async function processClaimedItem(claimed: ClaimedItem) {
  const db = getDb();
  const startedAt = Date.now();
  let contextSnapshotId: string | null = null;
  let currentTask: "CANON_EXTRACTION" | "MAIN_TRANSLATION" | "FIRST_QA" | "ESCALATION" = "MAIN_TRANSLATION";
  let currentModelId = claimed.job.modelId;
  try {
    const [mainModelRows, promptRows, automaticModels] = await Promise.all([
      db.select().from(translationAiModels).where(eq(translationAiModels.id, claimed.job.modelId)).limit(1),
      db.select().from(translationPromptVersions).where(eq(translationPromptVersions.id, claimed.job.promptVersionId)).limit(1),
      db.select().from(translationAiModels).where(eq(translationAiModels.isActive, true)),
    ]);
    const config = { model: mainModelRows[0], prompt: promptRows[0] };
    if (!config.model || !config.prompt || !config.model.isActive || !config.prompt.isActive) throw new Error("AI model or prompt is disabled");
    const built = await buildContext(claimed.job, claimed.item.translationChapterId, claimed.item.sourceSnapshotId);
    contextSnapshotId = built.contextSnapshot.id;

    await db.update(translationJobItems).set({ progressPercent: 15, progressStage: "CANON_ANALYSIS" }).where(eq(translationJobItems.id, claimed.item.id));
    const canonModel = modelForTask(automaticModels, "CANON_EXTRACTION");
    currentTask = "CANON_EXTRACTION";
    currentModelId = canonModel.id;
    const chapterAnalysis = await analyzeChapterWithAi({
      model: canonModel,
      sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
      sourceContent: built.source.content,
      context: built.context,
    });
    await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, chapterAnalysis.call);
    const learnedTerms = chapterAnalysis.value.glossaryCandidates
      .filter((entry) => entry.confidence >= 70)
      .filter((entry) => entry.sourceTerm.trim() && entry.targetTerm.trim())
      .filter((entry, index, rows) => rows.findIndex((candidate) => candidate.sourceTerm.trim().toLocaleLowerCase() === entry.sourceTerm.trim().toLocaleLowerCase()) === index);
    if (learnedTerms.length) {
      await db.insert(translationGlossaryEntries).values(learnedTerms.map((entry) => ({
        workspaceId: claimed.job.workspaceId,
        sourceTerm: entry.sourceTerm.trim(),
        targetTerm: entry.targetTerm.trim(),
        note: entry.note?.trim() || `AI เสนอจากตอน ${built.chapter.chapterNumber} · ความมั่นใจ ${entry.confidence}%`,
        isLocked: false,
        createdBy: claimed.job.requestedBy,
      }))).onConflictDoNothing();
    }

    await db.update(translationJobItems).set({ progressPercent: 35, progressStage: "AI_REQUEST" }).where(eq(translationJobItems.id, claimed.item.id));
    currentTask = "MAIN_TRANSLATION";
    currentModelId = config.model.id;
    const result = await getTranslationProvider(config.model.provider).translate({
      model: config.model,
      prompt: config.prompt,
      context: { ...built.context, chapterAnalysis: chapterAnalysis.value },
      sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
      sourceContent: built.source.content,
    });
    await db.insert(translationAiInvocations).values({
      jobItemId: claimed.item.id,
      modelId: config.model.id,
      task: "MAIN_TRANSLATION",
      contextSnapshotId: built.contextSnapshot.id,
      providerRequestId: result.providerRequestId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costMicros: Math.round((result.inputTokens * Number(config.model.inputCostMicrosPerMillion) + result.outputTokens * Number(config.model.outputCostMicrosPerMillion)) / 1_000_000),
      latencyMs: result.latencyMs,
      status: "SUCCESS",
    });

    await db.update(translationJobItems).set({ progressPercent: 70, progressStage: "AI_QA" }).where(eq(translationJobItems.id, claimed.item.id));
    let translation = result.translation;
    const qaModel = modelForTask(automaticModels, "FIRST_QA");
    currentTask = "FIRST_QA";
    currentModelId = qaModel.id;
    let qa = await qaTranslationWithAi({
      model: qaModel,
      sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
      sourceContent: built.source.content,
      translatedTitle: translation.title,
      translatedContent: translation.content,
      context: { ...built.context, chapterAnalysis: chapterAnalysis.value },
    });
    await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, qa.call);

    if (!qa.value.passed) {
      await db.update(translationJobItems).set({ progressPercent: 82, progressStage: "ESCALATION" }).where(eq(translationJobItems.id, claimed.item.id));
      const escalationModel = modelForTask(automaticModels, "ESCALATION");
      currentTask = "ESCALATION";
      currentModelId = escalationModel.id;
      const revision = await reviseTranslationWithAi({
        model: escalationModel,
        prompt: config.prompt,
        sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
        sourceContent: built.source.content,
        translatedTitle: translation.title,
        translatedContent: translation.content,
        context: { ...built.context, chapterAnalysis: chapterAnalysis.value },
        qa: qa.value,
      });
      await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, revision.call);
      translation = revision.value;
      await db.update(translationJobItems).set({ progressPercent: 87, progressStage: "AI_QA" }).where(eq(translationJobItems.id, claimed.item.id));
      currentTask = "FIRST_QA";
      currentModelId = qaModel.id;
      qa = await qaTranslationWithAi({
        model: qaModel,
        sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
        sourceContent: built.source.content,
        translatedTitle: translation.title,
        translatedContent: translation.content,
        context: { ...built.context, chapterAnalysis: chapterAnalysis.value },
      });
      await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, qa.call);
    }

    await db.update(translationJobItems).set({ progressPercent: 92, progressStage: "CODE_QA" }).where(eq(translationJobItems.id, claimed.item.id));
    await db.update(translationJobItems).set({ progressPercent: 96, progressStage: "SAVING" }).where(eq(translationJobItems.id, claimed.item.id));
    await db.transaction(async (tx) => {
      const [latest] = await tx.select().from(translationVersions).where(eq(translationVersions.translationChapterId, built.chapter.id)).orderBy(desc(translationVersions.revision)).limit(1);
      const version = await insertTranslationVersion(tx, {
        chapter: { ...built.chapter, sourceSnapshotId: claimed.item.sourceSnapshotId },
        title: translation.title,
        content: translation.content,
        origin: "AI",
        parentVersionId: latest?.id ?? null,
        contextSnapshotId: built.contextSnapshot.id,
        actorId: claimed.job.requestedBy,
      });
      const issues = await replaceQaIssues(tx, version.id, built.source.content, translation.content, claimed.job.workspaceId);
      if (qa.value.issues.length) await tx.insert(translationQaIssues).values(qa.value.issues.map((issue) => ({
        translationVersionId: version.id,
        code: `AI_${issue.code}`.slice(0, 80),
        severity: issue.severity,
        message: issue.message,
        metadata: {
          source: "AI_QA",
          score: qa.value.score,
          location: issue.location,
          currentText: issue.currentText,
          suggestedText: issue.suggestedText,
        },
      })));
      const hasCriticalIssue = !qa.value.passed || issues.some((issue) => issue.severity === "CRITICAL") || qa.value.issues.some((issue) => issue.severity === "CRITICAL");
      const now = new Date();
      await tx.update(translationJobItems).set({ status: "COMPLETED", progressPercent: 100, progressStage: "DONE", finishedAt: now, lastError: null }).where(eq(translationJobItems.id, claimed.item.id));
      await tx.update(translationChapters).set({ status: hasCriticalIssue ? "QA_FAILED" : "REVIEW", lockVersion: built.chapter.lockVersion + 1, updatedAt: now }).where(and(
        eq(translationChapters.id, built.chapter.id),
        eq(translationChapters.lockVersion, built.chapter.lockVersion),
        eq(translationChapters.sourceSnapshotId, claimed.item.sourceSnapshotId),
      ));
    });
  } catch (error) {
    const message = safeError(error);
    const retry = claimed.item.attempts < MAX_ATTEMPTS;
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(translationAiInvocations).values({
        jobItemId: claimed.item.id,
        modelId: currentModelId,
        task: currentTask,
        contextSnapshotId,
        latencyMs: Date.now() - startedAt,
        status: "FAILED",
        errorCode: error instanceof Error ? error.name.slice(0, 120) : "UNKNOWN",
      });
      await tx.update(translationJobItems).set({
        status: retry ? "QUEUED" : "FAILED",
        progressPercent: retry ? 0 : 100,
        progressStage: retry ? "QUEUED" : "FAILED",
        availableAt: retry ? new Date(Date.now() + 2 ** claimed.item.attempts * 30_000) : now,
        finishedAt: retry ? null : now,
        lastError: message,
      }).where(eq(translationJobItems.id, claimed.item.id));
      await tx.update(translationChapters).set({ status: retry ? "QUEUED" : "FAILED", updatedAt: now }).where(and(
        eq(translationChapters.id, claimed.item.translationChapterId),
        eq(translationChapters.sourceSnapshotId, claimed.item.sourceSnapshotId),
        eq(translationChapters.status, "TRANSLATING"),
      ));
    });
    workerLogger.warn("Translation job item failed", { jobId: claimed.job.id, jobItemId: claimed.item.id, attempt: claimed.item.attempts, willRetry: retry, errorCode: error instanceof Error ? error.name : "UNKNOWN" });
  } finally {
    await refreshJob(claimed.job.id);
  }
}

/** Bounded and safe for cron/worker invocation. Concurrent workers use SKIP LOCKED. */
export async function processTranslationJobs(limit = 10) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  let processed = 0;
  while (processed < safeLimit) {
    const claimed = await claimNextItem();
    if (!claimed) break;
    await processClaimedItem(claimed);
    processed += 1;
  }
  return { processed };
}
