import "server-only";

import { and, asc, eq, max } from "drizzle-orm";

import { getDb } from "@/db";
import {
  translationGlossaryEntries,
  translationQaIssues,
  translationSegments,
  translationSourceSegments,
  translationVersions,
  type TranslationChapter,
} from "@/db/schema";
import { runDeterministicQa, segmentText } from "@/lib/domain/translation";

type Transaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

export async function insertTranslationVersion(tx: Transaction, input: {
  chapter: TranslationChapter;
  title: string;
  content: string;
  origin: "MANUAL" | "AI";
  parentVersionId?: string | null;
  contextSnapshotId?: string | null;
  actorId?: string | null;
}) {
  const [revisionRow] = await tx.select({ value: max(translationVersions.revision) }).from(translationVersions).where(eq(translationVersions.translationChapterId, input.chapter.id));
  const [version] = await tx.insert(translationVersions).values({
    translationChapterId: input.chapter.id,
    revision: Number(revisionRow?.value ?? 0) + 1,
    parentVersionId: input.parentVersionId ?? null,
    contextSnapshotId: input.contextSnapshotId ?? null,
    title: input.title,
    content: input.content,
    origin: input.origin,
    createdBy: input.actorId ?? null,
  }).returning();
  const sourceSegments = await tx.select().from(translationSourceSegments).where(eq(translationSourceSegments.sourceSnapshotId, input.chapter.sourceSnapshotId)).orderBy(asc(translationSourceSegments.segmentIndex));
  const translatedSegments = segmentText(input.content);
  if (translatedSegments.length) await tx.insert(translationSegments).values(translatedSegments.map((segment) => ({
    translationVersionId: version.id,
    segmentIndex: segment.segmentIndex,
    sourceSegmentId: sourceSegments[segment.segmentIndex]?.id ?? null,
    content: segment.content,
  })));
  return version;
}

export async function replaceQaIssues(tx: Transaction, versionId: string, source: string, translation: string, workspaceId: string) {
  const lockedTerms = await tx.select({ sourceTerm: translationGlossaryEntries.sourceTerm, targetTerm: translationGlossaryEntries.targetTerm })
    .from(translationGlossaryEntries).where(and(eq(translationGlossaryEntries.workspaceId, workspaceId), eq(translationGlossaryEntries.isLocked, true)));
  const issues = runDeterministicQa({ source, translation, lockedTerms });
  if (issues.length) await tx.insert(translationQaIssues).values(issues.map((issue) => ({ translationVersionId: versionId, ...issue, metadata: issue.metadata ?? {} })));
  return issues;
}
