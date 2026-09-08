import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, lt, lte } from "drizzle-orm";

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
  translationPromptVersions,
  translationSourceSnapshots,
  translationVersions,
  translationWorkspaces,
} from "@/db/schema";
import { estimateTokens, sha256 } from "@/lib/domain/translation";
import { logger } from "@/lib/logger";
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
    const [item] = await tx.update(translationJobItems).set({ status: "RUNNING", attempts: row.item.attempts + 1, startedAt: now, lastError: null })
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

  const [allTerms, allCharacters, previousApproved] = await Promise.all([
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

async function processClaimedItem(claimed: ClaimedItem) {
  const db = getDb();
  const startedAt = Date.now();
  let contextSnapshotId: string | null = null;
  try {
    const [config] = await db.select({ model: translationAiModels, prompt: translationPromptVersions })
      .from(translationAiModels)
      .innerJoin(translationPromptVersions, eq(translationPromptVersions.id, claimed.job.promptVersionId))
      .where(eq(translationAiModels.id, claimed.job.modelId)).limit(1);
    if (!config || !config.model.isActive || !config.prompt.isActive) throw new Error("AI model or prompt is disabled");
    const built = await buildContext(claimed.job, claimed.item.translationChapterId, claimed.item.sourceSnapshotId);
    contextSnapshotId = built.contextSnapshot.id;
    const result = await getTranslationProvider(config.model.provider).translate({
      model: config.model,
      prompt: config.prompt,
      context: built.context,
      sourceTitle: built.source.title ?? `Chapter ${built.chapter.chapterNumber}`,
      sourceContent: built.source.content,
    });
    const costMicros = Math.round((result.inputTokens * Number(config.model.inputCostMicrosPerMillion) + result.outputTokens * Number(config.model.outputCostMicrosPerMillion)) / 1_000_000);
    await db.transaction(async (tx) => {
      const [latest] = await tx.select().from(translationVersions).where(eq(translationVersions.translationChapterId, built.chapter.id)).orderBy(desc(translationVersions.revision)).limit(1);
      const version = await insertTranslationVersion(tx, {
        chapter: { ...built.chapter, sourceSnapshotId: claimed.item.sourceSnapshotId },
        title: result.translation.title,
        content: result.translation.content,
        origin: "AI",
        parentVersionId: latest?.id ?? null,
        contextSnapshotId: built.contextSnapshot.id,
        actorId: claimed.job.requestedBy,
      });
      const issues = await replaceQaIssues(tx, version.id, built.source.content, result.translation.content, claimed.job.workspaceId);
      await tx.insert(translationAiInvocations).values({
        jobItemId: claimed.item.id,
        modelId: claimed.job.modelId,
        contextSnapshotId: built.contextSnapshot.id,
        providerRequestId: result.providerRequestId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costMicros,
        latencyMs: result.latencyMs,
        status: "SUCCESS",
      });
      const now = new Date();
      await tx.update(translationJobItems).set({ status: "COMPLETED", finishedAt: now, lastError: null }).where(eq(translationJobItems.id, claimed.item.id));
      await tx.update(translationChapters).set({ status: issues.some((issue) => issue.severity === "CRITICAL") ? "QA_FAILED" : "REVIEW", lockVersion: built.chapter.lockVersion + 1, updatedAt: now }).where(and(
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
        modelId: claimed.job.modelId,
        contextSnapshotId,
        latencyMs: Date.now() - startedAt,
        status: "FAILED",
        errorCode: error instanceof Error ? error.name.slice(0, 120) : "UNKNOWN",
      });
      await tx.update(translationJobItems).set({
        status: retry ? "QUEUED" : "FAILED",
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
