import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, lt, lte, ne, notExists, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

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
import { applySafeQaSuggestions, applyValidatedQaPatches, decideTranslationQa, estimateTokens, runDeterministicQa, sha256, type TranslationQaIssue } from "@/lib/domain/translation";
import { automaticModelNameForTask, type AutomaticTranslationTask } from "@/lib/domain/translation-ai-routing";
import { logger } from "@/lib/logger";
import { aiCallCostMicros, aiUsageCostMicros, qaTranslationWithAi, reviseTranslationWithAi, reviseTranslationWithPatchesAi, translateChapterWithCanonAi, type AiCallRecord } from "@/services/ai/translation-pipeline";
import { getTranslationProvider } from "@/services/ai/translation-provider";
import { insertTranslationVersion, replaceQaIssues } from "@/services/translation-version-service";

const workerLogger = logger.child({ component: "translation-worker" });
const MAX_ATTEMPTS = 3;
const MAX_QA_CORRECTION_ROUNDS = 2;
const activeTranslationJobItems = alias(translationJobItems, "active_translation_job_items");
const activeTranslationJobs = alias(translationJobs, "active_translation_jobs");

const checkpointChapterAnalysisSchema = z.object({
  summary: z.string(),
  continuityFacts: z.array(z.string()),
  entities: z.array(z.string()),
  glossaryCandidates: z.array(z.object({
    sourceTerm: z.string(),
    targetTerm: z.string(),
    note: z.string().nullable(),
    confidence: z.number().int().min(0).max(100),
  })),
  difficulty: z.enum(["NORMAL", "HARD"]),
  translationNotes: z.array(z.string()),
});

const translationCheckpointSchema = z.object({ title: z.string().min(1), content: z.string().min(1) });
const jobCheckpointSchema = z.object({
  version: z.literal(1),
  sourceSnapshotId: z.string().uuid(),
  chapterAnalysis: checkpointChapterAnalysisSchema.nullable(),
  translation: translationCheckpointSchema.nullable(),
});
type JobCheckpoint = z.infer<typeof jobCheckpointSchema>;

function readCheckpoint(value: unknown, sourceSnapshotId: string): JobCheckpoint {
  const parsed = jobCheckpointSchema.safeParse(value);
  if (parsed.success && parsed.data.sourceSnapshotId === sourceSnapshotId) {
    return parsed.data.translation && !parsed.data.chapterAnalysis
      ? { ...parsed.data, translation: null }
      : parsed.data;
  }
  return { version: 1, sourceSnapshotId, chapterAnalysis: null, translation: null };
}

async function saveCheckpoint(jobItemId: string, checkpoint: JobCheckpoint) {
  await getDb().update(translationJobItems).set({ checkpoint }).where(eq(translationJobItems.id, jobItemId));
}

type AiQaResult = Awaited<ReturnType<typeof qaTranslationWithAi>>["value"];

function qaMinimumScore() {
  const configured = Number(process.env.AI_TRANSLATION_QA_MIN_SCORE);
  return Number.isFinite(configured) ? Math.max(0, Math.min(100, Math.round(configured))) : 90;
}

function qaDecision(qa: AiQaResult, deterministicIssues: TranslationQaIssue[]) {
  return decideTranslationQa({
    score: qa.score,
    aiIssues: qa.issues.map((issue) => ({ code: issue.code, severity: issue.severity, message: issue.message })),
    deterministicIssues,
    minimumScore: qaMinimumScore(),
  });
}

function requiresCorrection(qa: AiQaResult, deterministicIssues: TranslationQaIssue[]) {
  return qaDecision(qa, deterministicIssues).needsCorrection;
}

function hasStructuralCriticalIssue(qa: AiQaResult, deterministicIssues: TranslationQaIssue[]) {
  return qaDecision(qa, deterministicIssues).blockingIssues.some((issue) =>
    /EMPTY|MISSING|OMISSION|TRUNCAT|STRUCTUR|PARAGRAPH|ADDITION/i.test(issue.code),
  );
}

function qaForAutomaticCorrection(qa: AiQaResult, deterministicIssues: TranslationQaIssue[]): AiQaResult {
  const decision = qaDecision(qa, deterministicIssues);
  const issuesToFix = decision.scoreNeedsImprovement
    ? qa.issues.filter((issue) => issue.severity !== "INFO")
    : qa.issues.filter((issue) => issue.severity === "CRITICAL");
  const deterministicAiIssues = deterministicIssues.filter((issue) => issue.severity === "CRITICAL").map((issue) => ({
    code: issue.code,
    severity: issue.severity,
    message: issue.message,
    location: "CONTENT" as const,
    currentText: null,
    suggestedText: null,
  }));
  const deterministicInstructions = deterministicIssues.filter((issue) => issue.severity === "CRITICAL").map((issue) => {
    const sourceTerm = typeof issue.metadata?.sourceTerm === "string" ? issue.metadata.sourceTerm : null;
    const targetTerm = typeof issue.metadata?.targetTerm === "string" ? issue.metadata.targetTerm : null;
    if (issue.code === "LOCKED_GLOSSARY_MISSING" && sourceTerm && targetTerm) {
      return `แก้คำแปลของ “${sourceTerm}” ให้ใช้หนึ่งรูปจาก glossary “${targetTerm}” ตามบริบทและระดับภาษาอย่างสม่ำเสมอ`;
    }
    return `แก้ปัญหา deterministic QA: ${issue.message}`;
  });
  return {
    ...qa,
    passed: false,
    score: Math.min(qa.score, 60),
    issues: [...issuesToFix, ...deterministicAiIssues].slice(0, 100),
    correctionInstructions: [...qa.correctionInstructions, ...deterministicInstructions].slice(0, 50),
  };
}

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
      .innerJoin(translationChapters, eq(translationChapters.id, translationJobItems.translationChapterId))
      // Lock the workspace row too: concurrent workers may process different
      // novels, but never two chapters from the same continuity stream.
      .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationJobs.workspaceId))
      .where(and(
        eq(translationJobItems.status, "QUEUED"),
        lte(translationJobItems.availableAt, new Date()),
        inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
        isNull(translationJobs.cancelRequestedAt),
        // The workspace row lock serializes concurrent claims. This persisted
        // RUNNING guard keeps the next lane from claiming another chapter after
        // the claim transaction commits and the AI work continues outside it.
        notExists(
          tx.select({ id: activeTranslationJobItems.id })
            .from(activeTranslationJobItems)
            .innerJoin(activeTranslationJobs, eq(activeTranslationJobs.id, activeTranslationJobItems.jobId))
            .where(and(
              eq(activeTranslationJobItems.status, "RUNNING"),
              eq(activeTranslationJobs.workspaceId, translationJobs.workspaceId),
            )),
        ),
      ))
      .orderBy(
        asc(translationJobs.createdAt),
        asc(translationChapters.chapterNumber),
        asc(translationJobItems.availableAt),
        asc(translationJobItems.id),
      )
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
    db.select().from(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, job.workspaceId)),
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
      .limit(1),
    db.select({ snapshot: translationProfileVersions.snapshot }).from(translationProfileVersions).where(and(
      eq(translationProfileVersions.workspaceId, job.workspaceId),
      sql`${translationProfileVersions.snapshot} ? 'analysis'`,
    )).orderBy(desc(translationProfileVersions.version)).limit(1),
  ]);

  const haystack = `${row.source.title ?? ""}\n${row.source.content}`.toLocaleLowerCase();
  const chapterTerms = allTerms.filter((entry) => haystack.includes(entry.sourceTerm.toLocaleLowerCase()));
  const relevantTerms = chapterTerms.filter((entry) => entry.isLocked).map((entry) => ({ source: entry.sourceTerm, target: entry.targetTerm, note: entry.note }));
  const suggestedTerms = chapterTerms.filter((entry) => !entry.isLocked).map((entry) => ({ source: entry.sourceTerm, target: entry.targetTerm, note: entry.note }));
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
    suggestedGlossary: suggestedTerms,
    characters: relevantCharacters,
    previousApproved: previousApproved.map((entry) => ({ chapterNumber: entry.chapterNumber, title: entry.title, ending: entry.content.slice(-2_500) })),
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
    promptCacheEnabled: call.result.promptCacheEnabled,
    cachedInputTokens: call.result.cachedInputTokens,
    cacheWriteInputTokens: call.result.cacheWriteInputTokens,
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
    const stableContext = {
      sourceLanguage: built.context.sourceLanguage,
      targetLanguage: built.context.targetLanguage,
      profile: built.context.profile,
      genreContext: built.context.genreContext,
    };
    const chapterContext = {
      chapterNumber: built.context.chapterNumber,
      glossary: built.context.glossary,
      suggestedGlossary: built.context.suggestedGlossary,
      characters: built.context.characters,
      previousApproved: built.context.previousApproved,
    };
    const cacheFor = (task: string) => ({
      key: `nw:${sha256(`${claimed.job.workspaceId}:${built.profile.version}:${task}`).slice(0, 56)}`,
      stablePayload: { context: stableContext },
    });
    let checkpoint = readCheckpoint(claimed.item.checkpoint, claimed.item.sourceSnapshotId);
    let chapterAnalysis = checkpoint.chapterAnalysis;

    if (!chapterAnalysis) {
      await db.update(translationJobItems).set({ progressPercent: 25, progressStage: "AI_REQUEST" }).where(eq(translationJobItems.id, claimed.item.id));
      currentTask = "MAIN_TRANSLATION";
      currentModelId = config.model.id;
      const combined = await translateChapterWithCanonAi({
        model: config.model,
        prompt: config.prompt,
        sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
        sourceContent: built.source.content,
        context: chapterContext,
        cache: cacheFor("MAIN_TRANSLATION_WITH_CANON"),
      });
      await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, combined.call);
      chapterAnalysis = combined.value.chapterAnalysis;
      checkpoint = { ...checkpoint, chapterAnalysis, translation: combined.value.translation };
      await saveCheckpoint(claimed.item.id, checkpoint);
      const learnedTerms = chapterAnalysis.glossaryCandidates
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
    }

    const savedTranslation = checkpoint.translation;
    let translation: z.infer<typeof translationCheckpointSchema>;
    if (savedTranslation) {
      translation = savedTranslation;
    } else {
      await db.update(translationJobItems).set({ progressPercent: 35, progressStage: "AI_REQUEST" }).where(eq(translationJobItems.id, claimed.item.id));
      currentTask = "MAIN_TRANSLATION";
      currentModelId = config.model.id;
      const result = await getTranslationProvider(config.model.provider).translate({
        model: config.model,
        prompt: config.prompt,
        context: { ...chapterContext, chapterAnalysis },
        cache: cacheFor("MAIN_TRANSLATION"),
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
        promptCacheEnabled: result.promptCacheEnabled,
        cachedInputTokens: result.cachedInputTokens,
        cacheWriteInputTokens: result.cacheWriteInputTokens,
        outputTokens: result.outputTokens,
        costMicros: aiUsageCostMicros(config.model, result),
        latencyMs: result.latencyMs,
        status: "SUCCESS",
      });
      translation = result.translation;
      checkpoint = { ...checkpoint, translation };
      await saveCheckpoint(claimed.item.id, checkpoint);
    }

    const reviewContext = {
      chapterNumber: built.context.chapterNumber,
      glossary: built.context.glossary,
      suggestedGlossary: built.context.suggestedGlossary,
      characters: built.context.characters,
      chapterAnalysis: {
        summary: chapterAnalysis.summary,
        continuityFacts: chapterAnalysis.continuityFacts.slice(0, 24),
        difficulty: chapterAnalysis.difficulty,
        translationNotes: chapterAnalysis.translationNotes.slice(0, 20),
      },
    };

    await db.update(translationJobItems).set({ progressPercent: 70, progressStage: "AI_QA" }).where(eq(translationJobItems.id, claimed.item.id));
    const qaModel = modelForTask(automaticModels, "FIRST_QA");
    currentTask = "FIRST_QA";
    currentModelId = qaModel.id;
    const runAiQa = async () => {
      const checked = await qaTranslationWithAi({
        model: qaModel,
        sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
        sourceContent: built.source.content,
        translatedTitle: translation.title,
        translatedContent: translation.content,
        context: reviewContext,
        cache: cacheFor("FIRST_QA"),
      });
      await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, checked.call);
      return checked;
    };
    const runCodeQa = () => runDeterministicQa({
      source: built.source.content,
      translation: translation.content,
      lockedTerms: built.context.glossary.map((term) => ({ sourceTerm: term.source, targetTerm: term.target })),
    });

    let qa = await runAiQa();
    let deterministicIssues = runCodeQa();
    let correctionRound = 0;
    const initialDecision = qaDecision(qa.value, deterministicIssues);
    const safeSuggestions = applySafeQaSuggestions(translation, qa.value.issues);
    if (safeSuggestions.appliedCount > 0) {
      translation = safeSuggestions.translation;
      checkpoint = { ...checkpoint, translation };
      await saveCheckpoint(claimed.item.id, checkpoint);
      qa = { ...qa, value: { ...qa.value, issues: safeSuggestions.remainingIssues } };
      deterministicIssues = runCodeQa();
      // Warnings are already fixed locally and do not justify another full QA
      // request. Critical/low-score results are always verified again.
      if (initialDecision.needsCorrection) {
        await db.update(translationJobItems).set({ progressPercent: 78, progressStage: "AI_QA" }).where(eq(translationJobItems.id, claimed.item.id));
        qa = await runAiQa();
        deterministicIssues = runCodeQa();
      }
    }
    for (; correctionRound < MAX_QA_CORRECTION_ROUNDS && requiresCorrection(qa.value, deterministicIssues); correctionRound += 1) {
      await db.update(translationJobItems).set({ progressPercent: 80 + correctionRound * 5, progressStage: "ESCALATION" }).where(eq(translationJobItems.id, claimed.item.id));
      const structuralCritical = hasStructuralCriticalIssue(qa.value, deterministicIssues);
      const usePremiumCorrection = chapterAnalysis.difficulty === "HARD" || structuralCritical || correctionRound > 0;
      const escalationModel = modelForTask(automaticModels, usePremiumCorrection ? "ESCALATION" : "MAIN_TRANSLATION");
      currentTask = "ESCALATION";
      currentModelId = escalationModel.id;
      const patchResult = await reviseTranslationWithPatchesAi({
        model: escalationModel,
        sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
        sourceContent: built.source.content,
        translatedTitle: translation.title,
        translatedContent: translation.content,
        context: reviewContext,
        qa: qaForAutomaticCorrection(qa.value, deterministicIssues),
        cache: cacheFor(usePremiumCorrection ? "ESCALATION_PATCH" : "MAIN_PATCH"),
      });
      await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, patchResult.call);
      const patched = applyValidatedQaPatches(translation, patchResult.value.patches);
      translation = patched.translation;

      // Full-chapter generation is a last resort reserved for source omissions
      // or broken structure that cannot be repaired with validated local edits.
      if ((patchResult.value.requiresFullRewrite || (patched.appliedCount === 0 && structuralCritical)) && structuralCritical) {
        const premiumModel = modelForTask(automaticModels, "ESCALATION");
        currentModelId = premiumModel.id;
        const revision = await reviseTranslationWithAi({
          model: premiumModel,
          prompt: config.prompt,
          sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
          sourceContent: built.source.content,
          translatedTitle: translation.title,
          translatedContent: translation.content,
          context: reviewContext,
          qa: qaForAutomaticCorrection(qa.value, deterministicIssues),
          cache: cacheFor("ESCALATION_FULL_REWRITE"),
        });
        await recordStructuredInvocation(claimed.item.id, built.contextSnapshot.id, revision.call);
        translation = revision.value;
      }
      checkpoint = { ...checkpoint, translation };
      await saveCheckpoint(claimed.item.id, checkpoint);
      await db.update(translationJobItems).set({ progressPercent: 84 + correctionRound * 5, progressStage: "AI_QA" }).where(eq(translationJobItems.id, claimed.item.id));
      currentTask = "FIRST_QA";
      currentModelId = qaModel.id;
      qa = await runAiQa();
      deterministicIssues = runCodeQa();
    }

    await db.update(translationJobItems).set({ progressPercent: 94, progressStage: "CODE_QA" }).where(eq(translationJobItems.id, claimed.item.id));
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
      const hasBlockingIssue = requiresCorrection(qa.value, issues);
      const now = new Date();
      const autoApproved = !hasBlockingIssue && Boolean(claimed.job.requestedBy);
      const qaFailureMessage = hasBlockingIssue
        ? `QA ยังไม่ผ่านหลังแก้อัตโนมัติ: ${[
          ...qa.value.issues.filter((issue) => issue.severity !== "INFO").map((issue) => issue.message),
          ...issues.filter((issue) => issue.severity !== "INFO").map((issue) => issue.message),
          ...qa.value.correctionInstructions,
        ].slice(0, 3).join("; ") || "AI ระบุว่าฉบับแปลยังต้องแก้ไข"}`.slice(0, 1_000)
        : null;
      if (autoApproved) {
        await tx.update(translationVersions).set({ status: "SUPERSEDED" }).where(and(
          eq(translationVersions.translationChapterId, built.chapter.id),
          eq(translationVersions.status, "APPROVED"),
          ne(translationVersions.id, version.id),
        ));
        await tx.update(translationVersions).set({
          status: "APPROVED",
          approvedBy: claimed.job.requestedBy,
          approvedAt: now,
        }).where(eq(translationVersions.id, version.id));
      }
      await tx.update(translationJobItems).set({
        status: hasBlockingIssue ? "FAILED" : "COMPLETED",
        progressPercent: 100,
        progressStage: hasBlockingIssue ? "FAILED" : "DONE",
        finishedAt: now,
        lastError: qaFailureMessage,
        checkpoint: hasBlockingIssue ? checkpoint : {},
      }).where(eq(translationJobItems.id, claimed.item.id));
      await tx.update(translationChapters).set({ status: hasBlockingIssue ? "QA_FAILED" : autoApproved ? "APPROVED" : "REVIEW", lockVersion: built.chapter.lockVersion + 1, updatedAt: now }).where(and(
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
export async function processTranslationJobs(limit = 10, concurrency = Number(process.env.TRANSLATION_WORKER_CONCURRENCY ?? 2)) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const safeConcurrency = Number.isFinite(concurrency) ? Math.max(1, Math.min(Math.round(concurrency), 8, safeLimit)) : 1;
  let nextClaim = 0;
  let processed = 0;

  const runLane = async () => {
    while (nextClaim < safeLimit) {
      nextClaim += 1;
      const claimed = await claimNextItem();
      if (!claimed) return;
      await processClaimedItem(claimed);
      processed += 1;
    }
  };

  await Promise.all(Array.from({ length: safeConcurrency }, () => runLane()));
  return { processed };
}
