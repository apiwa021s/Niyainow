import "server-only";

import { and, count, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  adminAuditLogs,
  chapters,
  domainOutboxEvents,
  novelImportChapters,
  novelImportSources,
  novelImportSourceTexts,
  novelSearchDocuments,
  novelStatistics,
  novels,
  translationChapters,
  translationQaIssues,
  translationVersions,
  translationWorkspaces,
  users,
} from "@/db/schema";
import type { CurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/auth/permissions";
import { countWords } from "@/lib/domain/translation";
import { ApiError } from "@/lib/http/api-response";
import { createUniqueSlug, selectReadableSlugSource } from "@/lib/validation/slug";

function auditValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function writeAudit(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], actor: CurrentUser, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await tx.insert(adminAuditLogs).values({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    before: auditValue(before),
    after: auditValue(after),
  });
}

type TranslationPublicRow = {
  workspace: typeof translationWorkspaces.$inferSelect;
  translationChapter: typeof translationChapters.$inferSelect;
  version: typeof translationVersions.$inferSelect;
  novel: typeof novels.$inferSelect | null;
};

type TranslationTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function syncPublicNovelStatistics(tx: TranslationTx, novelId: string, now: Date) {
  // Publishing and approval can run in parallel for different translated
  // chapters. Serialize their aggregate updates so a slower transaction cannot
  // overwrite the latest chapter/counts calculated by a newer transaction.
  const [lockedNovel] = await tx.select({ id: novels.id }).from(novels)
    .where(eq(novels.id, novelId)).for("no key update").limit(1);
  if (!lockedNovel) throw new ApiError(409, "PUBLIC_NOVEL_MISSING", "ไม่พบนิยายฉบับร่างสำหรับเผยแพร่");

  const [chapterCounts] = await tx.select({
    total: sql<number>`count(*) filter (where ${chapters.deletedAt} is null)::int`.mapWith(Number),
    published: sql<number>`count(*) filter (where ${chapters.deletedAt} is null and ${chapters.status} = 'PUBLISHED')::int`.mapWith(Number),
  }).from(chapters).where(eq(chapters.novelId, novelId));
  const [latestPublicChapter] = await tx.select({ id: chapters.id, publishedAt: chapters.publishedAt }).from(chapters)
    .where(and(eq(chapters.novelId, novelId), eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt)))
    .orderBy(desc(chapters.sortOrder), desc(chapters.id)).limit(1);
  const statistics = {
    latestChapterId: latestPublicChapter?.id ?? null,
    totalChapters: Number(chapterCounts?.total ?? 0),
    publishedChapters: Number(chapterCounts?.published ?? 0),
    latestChapterAt: latestPublicChapter?.publishedAt ?? null,
    updatedAt: now,
  };
  await tx.insert(novelStatistics).values({ novelId, ...statistics })
    .onConflictDoUpdate({ target: novelStatistics.novelId, set: statistics });
  await tx.update(novels).set({ latestChapterAt: statistics.latestChapterAt, updatedAt: now }).where(eq(novels.id, novelId));
}

/** Ensures approved translation text exists as a non-public catalog draft. */
export async function stageApprovedTranslationDraft(tx: TranslationTx, row: TranslationPublicRow, actor: CurrentUser, now: Date) {
  const [source] = await tx.select().from(novelImportSources)
    .where(eq(novelImportSources.id, row.workspace.importSourceId)).limit(1).for("update");
  if (!source) throw new ApiError(409, "IMPORT_SOURCE_MISSING", "ไม่พบข้อมูล Import สำหรับสร้างนิยายฉบับร่าง");
  const textRows = await tx.select().from(novelImportSourceTexts).where(eq(novelImportSourceTexts.sourceId, source.id));
  const sourceText = textRows.find((text) => text.language.toLowerCase() === row.workspace.sourceLanguage.toLowerCase());
  const targetText = textRows.find((text) => text.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase());
  if (!sourceText) throw new ApiError(409, "IMPORT_METADATA_MISSING", "ไม่พบชื่อเรื่องต้นฉบับสำหรับสร้างนิยายฉบับร่าง");
  const localizedTitle = targetText?.title.trim() || sourceText.title;
  const localizedSynopsis = targetText?.synopsis?.trim() || sourceText.synopsis?.trim() || `Translated edition of ${sourceText.title}`;

  const linkedLanguageMatches = row.novel?.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase();
  let publicNovelId = linkedLanguageMatches ? row.workspace.novelId : null;
  let publicNovel = linkedLanguageMatches ? row.novel : null;
  if (!publicNovelId || !publicNovel) {
    if (source.linkedNovelId) {
      const [linkedNovel] = await tx.select().from(novels).where(and(eq(novels.id, source.linkedNovelId), isNull(novels.deletedAt))).limit(1);
      if (linkedNovel?.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase()) {
        publicNovelId = linkedNovel.id;
        publicNovel = linkedNovel;
      }
    }
    if (!publicNovelId || !publicNovel) {
      if (row.workspace.sourceLanguage.length > 16 || row.workspace.targetLanguage.length > 16) {
        throw new ApiError(409, "PUBLIC_LANGUAGE_UNSUPPORTED", "รหัสภาษายาวเกินกว่าที่นิยายสาธารณะรองรับ");
      }
      const publicSlug = await createUniqueSlug(
        selectReadableSlugSource(localizedTitle, sourceText.title),
        async (candidate) => {
          const [existing] = await tx.select({ id: novels.id }).from(novels).where(eq(novels.slug, candidate)).limit(1);
          return Boolean(existing);
        },
        "novel",
      );
      const [createdNovel] = await tx.insert(novels).values({
        slug: publicSlug,
        title: localizedTitle,
        titleOriginal: sourceText.title,
        synopsis: localizedSynopsis,
        synopsisOriginal: sourceText.synopsis,
        coverKey: source.coverKey,
        originalLanguage: row.workspace.sourceLanguage,
        language: row.workspace.targetLanguage,
        status: "ONGOING",
        publicationStatus: "DRAFT",
        originType: "licensed_translation",
        contentPolicyConfirmedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id,
      }).returning();
      publicNovelId = createdNovel.id;
      publicNovel = createdNovel;
      await tx.insert(novelStatistics).values({ novelId: createdNovel.id });
      await tx.insert(novelSearchDocuments).values({ novelId: createdNovel.id, searchText: [createdNovel.title, createdNovel.titleOriginal].filter(Boolean).join(" ") });
      await writeAudit(tx, actor, "translation.public_novel.stage", "novel", createdNovel.id, null, { importSourceId: source.id, publicationStatus: "DRAFT" });
    }
    await tx.update(translationWorkspaces).set({ novelId: publicNovelId, version: sql`${translationWorkspaces.version} + 1`, updatedAt: now }).where(eq(translationWorkspaces.id, row.workspace.id));
    await tx.update(novelImportSources).set({ linkedNovelId: publicNovelId, updatedAt: now }).where(and(eq(novelImportSources.id, row.workspace.importSourceId), isNull(novelImportSources.linkedNovelId)));
  }

  // Per-chapter approval/publishing must not overwrite editorial novel fields.
  // Imported metadata is used when the public novel is first staged; later
  // title, synopsis, cover, and banner edits belong to the novel editor flow.
  await tx.insert(novelSearchDocuments).values({
    novelId: publicNovelId,
    searchText: [publicNovel.title, publicNovel.titleOriginal].filter(Boolean).join(" "),
  }).onConflictDoUpdate({
    target: novelSearchDocuments.novelId,
    set: { searchText: [publicNovel.title, publicNovel.titleOriginal].filter(Boolean).join(" "), updatedAt: now },
  });

  let publicChapterId = row.translationChapter.linkedChapterId;
  if (publicChapterId) {
    const [linkedChapter] = await tx.select({ id: chapters.id, status: chapters.status }).from(chapters)
      .where(and(eq(chapters.id, publicChapterId), eq(chapters.novelId, publicNovelId), isNull(chapters.deletedAt))).limit(1);
    if (!linkedChapter) publicChapterId = null;
    else if (linkedChapter.status !== "PUBLISHED") {
      await tx.update(chapters).set({ title: row.version.title, content: row.version.content, wordCount: countWords(row.version.content), status: "DRAFT", publishedAt: null, scheduledFor: null, version: sql`${chapters.version} + 1`, updatedBy: actor.id, updatedAt: now }).where(eq(chapters.id, linkedChapter.id));
    }
  }
  if (!publicChapterId) {
    const [maxSort] = await tx.select({ value: max(chapters.sortOrder) }).from(chapters).where(eq(chapters.novelId, publicNovelId));
    const [createdChapter] = await tx.insert(chapters).values({
      novelId: publicNovelId,
      chapterNumber: row.translationChapter.chapterNumber,
      sortOrder: Number(maxSort?.value ?? 0) + 1,
      slug: `chapter-${row.translationChapter.chapterNumber}`,
      title: row.version.title,
      content: row.version.content,
      wordCount: countWords(row.version.content),
      status: "DRAFT",
      createdBy: actor.id,
      updatedBy: actor.id,
    }).returning({ id: chapters.id });
    publicChapterId = createdChapter.id;
    await tx.update(translationChapters).set({ linkedChapterId: createdChapter.id }).where(eq(translationChapters.id, row.translationChapter.id));
    await tx.update(novelImportChapters).set({ linkedChapterId: createdChapter.id, updatedAt: now }).where(and(eq(novelImportChapters.id, row.translationChapter.importChapterId), isNull(novelImportChapters.linkedChapterId)));
  }
  await syncPublicNovelStatistics(tx, publicNovelId, now);
  return { publicNovelId, publicChapterId };
}

/** Recheck current publishing rights when a background job finishes. */
export async function resolveTranslationPublishingActor(tx: TranslationTx, requestedBy: string | null): Promise<CurrentUser | null> {
  if (!requestedBy) return null;
  const [actor] = await tx.select({
    id: users.id,
    email: users.email,
    name: users.name,
    image: users.image,
    role: users.role,
    status: users.status,
  }).from(users).where(and(eq(users.id, requestedBy), isNull(users.deletedAt))).limit(1).for("share");
  return actor && can(actor, "translation.publish") ? actor : null;
}

/** Publish inside the worker completion transaction so a retry cannot duplicate its revision. */
export async function publishTranslationVersionInTransaction(tx: TranslationTx, actor: CurrentUser, workspaceId: string, chapterId: string, versionId: string) {
  if (!can(actor, "translation.publish")) {
    throw new ApiError(403, "TRANSLATION_PUBLISH_PERMISSION_REQUIRED", "ไม่มีสิทธิ์เผยแพร่คำแปล");
  }
  const [row] = await tx.select({ workspace: translationWorkspaces, translationChapter: translationChapters, version: translationVersions, novel: novels })
    .from(translationVersions)
    .innerJoin(translationChapters, eq(translationChapters.id, translationVersions.translationChapterId))
    .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationChapters.workspaceId))
    .leftJoin(novels, eq(novels.id, translationWorkspaces.novelId))
    .where(and(eq(translationVersions.id, versionId), eq(translationChapters.id, chapterId), eq(translationWorkspaces.id, workspaceId))).limit(1).for("update", { of: translationChapters });
  if (!row) throw new ApiError(404, "TRANSLATION_VERSION_NOT_FOUND", "ไม่พบเวอร์ชันคำแปล");
  if (row.version.status !== "APPROVED" && row.version.status !== "PUBLISHED") {
    throw new ApiError(409, "APPROVAL_REQUIRED", "เผยแพร่ได้เฉพาะเวอร์ชันที่อนุมัติแล้ว");
  }
  if (row.translationChapter.status !== "APPROVED" && row.translationChapter.status !== "PUBLISHED") {
    throw new ApiError(409, "CURRENT_APPROVAL_REQUIRED", "สถานะตอนเปลี่ยนหลังการอนุมัติ กรุณาตรวจและอนุมัติ revision ล่าสุดอีกครั้ง");
  }
  const [latestRevision] = await tx.select({ value: max(translationVersions.revision) }).from(translationVersions)
    .where(eq(translationVersions.translationChapterId, chapterId));
  if (row.version.revision !== Number(latestRevision?.value ?? 0)) {
    throw new ApiError(409, "LATEST_REVISION_REQUIRED", "เผยแพร่ได้เฉพาะ revision ล่าสุด");
  }
  const [critical] = await tx.select({ value: count() }).from(translationQaIssues).where(and(
    eq(translationQaIssues.translationVersionId, versionId),
    eq(translationQaIssues.severity, "CRITICAL"),
    isNull(translationQaIssues.resolvedAt),
  ));
  if (Number(critical?.value ?? 0) > 0) {
    throw new ApiError(409, "QA_BLOCKING", "ยังมีปัญหา QA ระดับ Critical ที่ต้องแก้ไข");
  }
  const now = new Date();
  const { publicNovelId, publicChapterId } = await stageApprovedTranslationDraft(tx, row, actor, now);
  const [publicNovel] = await tx.select({ slug: novels.slug, publishedAt: novels.publishedAt })
    .from(novels).where(and(eq(novels.id, publicNovelId), isNull(novels.deletedAt))).limit(1);
  if (!publicNovel) throw new ApiError(409, "PUBLIC_NOVEL_MISSING", "ไม่พบนิยายฉบับร่างสำหรับเผยแพร่");

  const [publishedChapter] = await tx.update(chapters).set({
    title: row.version.title,
    content: row.version.content,
    wordCount: countWords(row.version.content),
    status: "PUBLISHED",
    publishedAt: now,
    scheduledFor: null,
    version: sql`${chapters.version} + 1`,
    updatedBy: actor.id,
    updatedAt: now,
  }).where(and(eq(chapters.id, publicChapterId), eq(chapters.novelId, publicNovelId), inArray(chapters.status, ["DRAFT", "PUBLISHED"]))).returning({ id: chapters.id });
  if (!publishedChapter) throw new ApiError(409, "PUBLIC_DRAFT_REQUIRED", "ไม่พบตอนฉบับร่างสำหรับเผยแพร่");
  // Do not interpolate Date inside a raw sql fragment here. That bypasses
  // Drizzle's timestamp encoder and postgres-js receives a Date where it
  // expects a string. A regular mapped value is encoded correctly.
  const [publishedNovel] = await tx.update(novels).set({
    publicationStatus: "PUBLISHED",
    publishedAt: publicNovel.publishedAt ?? now,
    updatedBy: actor.id,
    updatedAt: now,
  }).where(and(eq(novels.id, publicNovelId), isNull(novels.deletedAt))).returning({ id: novels.id });
  if (!publishedNovel) throw new ApiError(409, "PUBLIC_NOVEL_MISSING", "ไม่พบนิยายฉบับร่างสำหรับเผยแพร่");
  await tx.update(translationVersions).set({ status: "SUPERSEDED" }).where(and(
    eq(translationVersions.translationChapterId, chapterId),
    eq(translationVersions.status, "PUBLISHED"),
    ne(translationVersions.id, versionId),
  ));
  await tx.update(translationVersions).set({ status: "PUBLISHED", publishedAt: row.version.publishedAt ?? now }).where(eq(translationVersions.id, versionId));
  await tx.update(translationChapters).set({ status: "PUBLISHED", updatedAt: now }).where(eq(translationChapters.id, chapterId));
  await syncPublicNovelStatistics(tx, publicNovelId, now);
  await tx.insert(domainOutboxEvents).values({ type: "chapter_published", aggregateType: "chapter", aggregateId: publicChapterId!, dedupeKey: `translation-published:${versionId}`, payload: { chapterId: publicChapterId, novelId: publicNovelId, novelSlug: publicNovel.slug, translationVersionId: versionId } }).onConflictDoNothing();
  if (row.version.status !== "PUBLISHED") {
    await writeAudit(tx, actor, "translation.version.publish", "translation_version", versionId, { status: "APPROVED" }, { status: "PUBLISHED", publicChapterId });
  }
  return { versionId, publicChapterId, publicNovelId, novelSlug: publicNovel.slug };
}

