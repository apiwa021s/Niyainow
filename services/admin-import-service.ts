import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, asc, count, countDistinct, desc, eq, exists, ilike, inArray, isNull, lte, max, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import {
  adminAuditLogs,
  chapters,
  domainOutboxEvents,
  mediaAssets,
  novelImportChapters,
  novelImportChapterTexts,
  novelImportMangaPages,
  novelImportSources,
  novelImportSourceTexts,
  novelSearchDocuments,
  novelStatistics,
  novels,
} from "@/db/schema";
import { assertAdmin } from "@/lib/auth/dal";
import { invalidateChapterCache } from "@/lib/redis/invalidation";
import { assetUrl } from "@/lib/site-config";
import { createUniqueSlug } from "@/lib/validation/slug";
import { AdminDataError } from "@/services/admin-service";

const PAGE_SIZE = 30;
const PUBLISH_BATCH_SIZE = 25;
const sourceIdSchema = z.uuid();
const SOURCE_STATUSES = ["ready", "paused", "blocked", "error"] as const;
const COVER_STATUSES = ["missing", "pending", "ready", "error"] as const;

export const adminImportPublishSchema = z.object({
  rightsConfirmed: z.literal(true),
}).strict();

export type AdminImportQuery = {
  q?: string;
  status?: string;
  cover?: string;
  page?: string | number;
};

export type AdminImportSourceRow = {
  id: string;
  provider: string;
  externalWorkId: string;
  importReference: string;
  title: string;
  sourceLanguage: string;
  contentFormat: string;
  status: string;
  coverStatus: string;
  coverUrl: string | null;
  chapterCount: number;
  languageCount: number;
  lastSuccessfulChapter: number | null;
  nextProbeChapter: number;
  linkedNovelId: string | null;
  updatedAt: string;
};

export type AdminImportChapterRow = {
  id: string;
  chapterNumber: number;
  sourceUrl: string;
  fetchedAt: string;
  linkedChapterId: string | null;
  originalTitle: string | null;
  mangaPageCount: number;
  texts: Array<{
    language: string;
    textKind: string;
    translationStatus: string;
    title: string | null;
    contentLength: number;
    version: number;
  }>;
};

export type AdminImportSourceDetail = AdminImportSourceRow & {
  seedUrl: string;
  coverSourceUrl: string | null;
  coverError: string | null;
  blockedReason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  publication: {
    canPublish: boolean;
    readyChapterCount: number;
    linkedChapterCount: number;
    novelSlug: string | null;
    reason: string | null;
  };
  texts: Array<{
    language: string;
    textKind: string;
    translationStatus: string;
    title: string;
    synopsis: string | null;
  }>;
  chapters: {
    items: AdminImportChapterRow[];
    page: number;
    total: number;
    totalPages: number;
  };
};

function normalizePage(value: string | number | undefined) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? Math.min(page, 100_000) : 1;
}

function cleanQuery(value: string | undefined) {
  return value?.trim().slice(0, 200) || undefined;
}

function safeLike(value: string) {
  return `%${value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

async function hydrateSourceRows(rows: Array<typeof novelImportSources.$inferSelect>) {
  if (!rows.length) return [];
  const db = getDb();
  const ids = rows.map(({ id }) => id);
  const [textRows, chapterCounts, languageCounts] = await Promise.all([
    db.select({
      sourceId: novelImportSourceTexts.sourceId,
      language: novelImportSourceTexts.language,
      title: novelImportSourceTexts.title,
    }).from(novelImportSourceTexts).where(inArray(novelImportSourceTexts.sourceId, ids)),
    db.select({
      sourceId: novelImportChapters.sourceId,
      value: count(),
    }).from(novelImportChapters).where(inArray(novelImportChapters.sourceId, ids)).groupBy(novelImportChapters.sourceId),
    db.select({
      sourceId: novelImportSourceTexts.sourceId,
      value: countDistinct(novelImportSourceTexts.language),
    }).from(novelImportSourceTexts).where(inArray(novelImportSourceTexts.sourceId, ids)).groupBy(novelImportSourceTexts.sourceId),
  ]);
  const titleMap = new Map(
    rows.map((source) => [
      source.id,
      textRows.find((text) => text.sourceId === source.id && text.language === source.sourceLanguage)?.title
        ?? textRows.find((text) => text.sourceId === source.id)?.title
        ?? source.importReference,
    ]),
  );
  const chapterCountMap = new Map(chapterCounts.map((row) => [row.sourceId, Number(row.value)]));
  const languageCountMap = new Map(languageCounts.map((row) => [row.sourceId, Number(row.value)]));

  return rows.map((source): AdminImportSourceRow => ({
    id: source.id,
    provider: source.provider,
    externalWorkId: source.externalWorkId,
    importReference: source.importReference,
    title: titleMap.get(source.id) ?? source.importReference,
    sourceLanguage: source.sourceLanguage,
    contentFormat: source.contentFormat,
    status: source.status,
    coverStatus: source.coverStatus,
    coverUrl: source.coverKey ? assetUrl(source.coverKey) : null,
    chapterCount: chapterCountMap.get(source.id) ?? 0,
    languageCount: languageCountMap.get(source.id) ?? 0,
    lastSuccessfulChapter: source.lastSuccessfulChapter,
    nextProbeChapter: source.nextProbeChapter,
    linkedNovelId: source.linkedNovelId,
    updatedAt: source.updatedAt.toISOString(),
  }));
}

export async function getAdminImportSources(query: AdminImportQuery = {}) {
  await assertAdmin();
  const page = normalizePage(query.page);
  const search = cleanQuery(query.q);
  const conditions: SQL[] = [];
  if (query.status && (SOURCE_STATUSES as readonly string[]).includes(query.status)) {
    conditions.push(eq(novelImportSources.status, query.status));
  }
  if (query.cover && (COVER_STATUSES as readonly string[]).includes(query.cover)) {
    conditions.push(eq(novelImportSources.coverStatus, query.cover));
  }
  if (search) {
    const pattern = safeLike(search);
    conditions.push(or(
      ilike(novelImportSources.provider, pattern),
      ilike(novelImportSources.externalWorkId, pattern),
      ilike(novelImportSources.importReference, pattern),
      exists(
        getDb().select({ id: novelImportSourceTexts.sourceId }).from(novelImportSourceTexts).where(and(
          eq(novelImportSourceTexts.sourceId, novelImportSources.id),
          ilike(novelImportSourceTexts.title, pattern),
        )),
      ),
    )!);
  }
  const where = conditions.length ? and(...conditions) : undefined;
  const db = getDb();
  const [rows, totals] = await Promise.all([
    db.select().from(novelImportSources).where(where)
      .orderBy(desc(novelImportSources.updatedAt), desc(novelImportSources.id))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(novelImportSources).where(where),
  ]);
  const total = Number(totals[0]?.value ?? 0);
  return {
    items: await hydrateSourceRows(rows),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getAdminImportSource(sourceIdInput: string, pageInput?: string | number) {
  await assertAdmin();
  const parsedId = sourceIdSchema.safeParse(sourceIdInput);
  if (!parsedId.success) return undefined;
  const page = normalizePage(pageInput);
  const db = getDb();
  const [source] = await db.select().from(novelImportSources)
    .where(eq(novelImportSources.id, parsedId.data)).limit(1);
  if (!source) return undefined;

  const [hydratedSource] = await hydrateSourceRows([source]);
  const [sourceTexts, chapterRows, chapterTotals, linkedNovelRows, linkedChapterTotals] = await Promise.all([
    db.select().from(novelImportSourceTexts)
      .where(eq(novelImportSourceTexts.sourceId, source.id))
      .orderBy(asc(novelImportSourceTexts.language)),
    db.select().from(novelImportChapters)
      .where(eq(novelImportChapters.sourceId, source.id))
      .orderBy(desc(novelImportChapters.chapterNumber))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(novelImportChapters)
      .where(eq(novelImportChapters.sourceId, source.id)),
    source.linkedNovelId
      ? db.select({ slug: novels.slug }).from(novels)
        .where(and(eq(novels.id, source.linkedNovelId), isNull(novels.deletedAt))).limit(1)
      : Promise.resolve([]),
    db.select({ value: count() }).from(novelImportChapters)
      .where(and(eq(novelImportChapters.sourceId, source.id), sql`${novelImportChapters.linkedChapterId} is not null`)),
  ]);
  const chapterIds = chapterRows.map(({ id }) => id);
  const [chapterTexts, mangaPageCounts] = chapterIds.length
    ? await Promise.all([db.select({
        chapterId: novelImportChapterTexts.chapterId,
        language: novelImportChapterTexts.language,
        textKind: novelImportChapterTexts.textKind,
        translationStatus: novelImportChapterTexts.translationStatus,
        title: novelImportChapterTexts.title,
        contentLength: sql<number>`length(coalesce(${novelImportChapterTexts.content}, ''))`.mapWith(Number),
        version: novelImportChapterTexts.version,
      }).from(novelImportChapterTexts)
        .where(inArray(novelImportChapterTexts.chapterId, chapterIds))
        .orderBy(asc(novelImportChapterTexts.language)),
      db.select({
        chapterId: novelImportMangaPages.chapterId,
        value: count(),
      }).from(novelImportMangaPages)
        .where(inArray(novelImportMangaPages.chapterId, chapterIds))
        .groupBy(novelImportMangaPages.chapterId),
    ])
    : [[], []];
  const textsByChapter = new Map<string, AdminImportChapterRow["texts"]>();
  for (const text of chapterTexts) {
    const item = {
      language: text.language,
      textKind: text.textKind,
      translationStatus: text.translationStatus,
      title: text.title,
      contentLength: text.contentLength,
      version: text.version,
    };
    textsByChapter.set(text.chapterId, [...(textsByChapter.get(text.chapterId) ?? []), item]);
  }
  const chapterTotal = Number(chapterTotals[0]?.value ?? 0);
  const readyChapterCount = Math.min(chapterTotal, source.lastSuccessfulChapter ?? 0);
  const canPublish = source.status !== "blocked" && readyChapterCount > 0;
  const mangaPageCountByChapter = new Map(mangaPageCounts.map((row) => [row.chapterId, Number(row.value)]));

  return {
    ...hydratedSource,
    seedUrl: source.seedUrl,
    coverSourceUrl: source.coverSourceUrl,
    coverError: source.coverError,
    blockedReason: source.blockedReason,
    metadata: source.metadata,
    createdAt: source.createdAt.toISOString(),
    publication: {
      canPublish,
      readyChapterCount,
      linkedChapterCount: Number(linkedChapterTotals[0]?.value ?? 0),
      novelSlug: linkedNovelRows[0]?.slug ?? null,
      reason: canPublish
        ? null
        : source.status === "blocked"
          ? "แหล่งนำเข้าถูกระงับ กรุณาตรวจสอบเหตุผลก่อนเผยแพร่"
          : "ยังไม่มีตอนที่ดาวน์โหลดเสร็จสมบูรณ์",
    },
    texts: sourceTexts.map((text) => ({
      language: text.language,
      textKind: text.textKind,
      translationStatus: text.translationStatus,
      title: text.title,
      synopsis: text.synopsis,
    })),
    chapters: {
      items: chapterRows.map((chapter) => ({
        id: chapter.id,
        chapterNumber: chapter.chapterNumber,
        sourceUrl: chapter.sourceUrl,
        originalTitle: chapter.originalTitle,
        fetchedAt: chapter.fetchedAt.toISOString(),
        linkedChapterId: chapter.linkedChapterId,
        mangaPageCount: mangaPageCountByChapter.get(chapter.id) ?? 0,
        texts: textsByChapter.get(chapter.id) ?? [],
      })),
      page,
      total: chapterTotal,
      totalPages: Math.max(1, Math.ceil(chapterTotal / PAGE_SIZE)),
    },
  } satisfies AdminImportSourceDetail;
}

type ImportTransaction = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];
type ImportChapterText = typeof novelImportChapterTexts.$inferSelect;

function countWords(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return 0;
  try {
    return [...new Intl.Segmenter("th", { granularity: "word" }).segment(trimmed)]
      .filter((item) => item.isWordLike).length;
  } catch {
    return trimmed.split(/\s+/u).length;
  }
}

function normalizedLanguage(value: string) {
  return value.trim().toLowerCase();
}

function chapterTextForLanguage(
  textRows: ImportChapterText[],
  language: string,
  sourceLanguage: string,
) {
  const requested = normalizedLanguage(language);
  const source = normalizedLanguage(sourceLanguage);
  return textRows.find((text) => {
    if (normalizedLanguage(text.language) !== requested || !text.content?.trim()) return false;
    return requested === source
      ? text.textKind === "source" && text.translationStatus === "source"
      : text.textKind === "translation" && text.translationStatus === "approved";
  });
}

function choosePublicationLanguage(
  sourceLanguage: string,
  sourceTexts: Array<typeof novelImportSourceTexts.$inferSelect>,
  contentFormat: string,
) {
  if (contentFormat !== "manga") return sourceLanguage;
  const approvedLanguages = sourceTexts
    .filter((text) => text.textKind === "translation" && text.translationStatus === "approved")
    .map((text) => text.language)
    .sort((left, right) => Number(normalizedLanguage(right) === "th") - Number(normalizedLanguage(left) === "th"));
  return approvedLanguages[0] ?? sourceLanguage;
}

async function syncPublishedNovelStatistics(tx: ImportTransaction, novelId: string, now: Date) {
  const [counts] = await tx.select({
    total: sql<number>`count(*) filter (where ${chapters.deletedAt} is null)::int`.mapWith(Number),
    published: sql<number>`count(*) filter (where ${chapters.deletedAt} is null and ${chapters.status} = 'PUBLISHED')::int`.mapWith(Number),
  }).from(chapters).where(eq(chapters.novelId, novelId));
  const [latest] = await tx.select({ id: chapters.id, publishedAt: chapters.publishedAt }).from(chapters)
    .where(and(eq(chapters.novelId, novelId), eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt)))
    .orderBy(desc(chapters.sortOrder), desc(chapters.id)).limit(1);
  const values = {
    latestChapterId: latest?.id ?? null,
    totalChapters: Number(counts?.total ?? 0),
    publishedChapters: Number(counts?.published ?? 0),
    latestChapterAt: latest?.publishedAt ?? null,
    updatedAt: now,
  };
  await tx.insert(novelStatistics).values({ novelId, ...values })
    .onConflictDoUpdate({ target: novelStatistics.novelId, set: values });
  await tx.update(novels).set({ latestChapterAt: values.latestChapterAt, updatedAt: now }).where(eq(novels.id, novelId));
}

/** Publishes the contiguous, fully downloaded import checkpoint into the public catalog. */
export async function publishAdminImport(sourceIdInput: string, inputValue: unknown) {
  const actor = await assertAdmin();
  const sourceId = sourceIdSchema.parse(sourceIdInput);
  adminImportPublishSchema.parse(inputValue);
  const now = new Date();
  const result = await getDb().transaction(async (tx) => {
    const [source] = await tx.select().from(novelImportSources)
      .where(eq(novelImportSources.id, sourceId)).limit(1).for("update");
    if (!source) throw new AdminDataError("IMPORT_SOURCE_NOT_FOUND", "ไม่พบแหล่งนำเข้านี้", 404);
    if (source.status === "blocked") {
      throw new AdminDataError("IMPORT_SOURCE_BLOCKED", "แหล่งนำเข้าถูกระงับ กรุณาตรวจสอบเหตุผลก่อนเผยแพร่", 409);
    }
    if (!source.lastSuccessfulChapter) {
      throw new AdminDataError("IMPORT_NO_READY_CHAPTERS", "ยังไม่มีตอนที่ดาวน์โหลดเสร็จสมบูรณ์", 409);
    }

    const readyChapters = await tx.select().from(novelImportChapters)
      .where(and(
        eq(novelImportChapters.sourceId, source.id),
        lte(novelImportChapters.chapterNumber, source.lastSuccessfulChapter),
      ))
      .orderBy(asc(novelImportChapters.chapterNumber));
    if (!readyChapters.length) {
      throw new AdminDataError("IMPORT_NO_READY_CHAPTERS", "ไม่พบตอนใน checkpoint ที่พร้อมเผยแพร่", 409);
    }
    let expectedChapterNumber = 1;
    for (const chapter of readyChapters) {
      if (chapter.chapterNumber !== expectedChapterNumber) break;
      expectedChapterNumber += 1;
    }
    if (expectedChapterNumber <= source.lastSuccessfulChapter) {
      throw new AdminDataError("IMPORT_CHAPTER_GAP", `ตอนที่นำเข้ายังไม่ต่อเนื่อง (ขาดตอน ${expectedChapterNumber})`, 409);
    }

    const linkedIds = readyChapters.flatMap((chapter) => chapter.linkedChapterId ? [chapter.linkedChapterId] : []);
    const linkedPublicChapters = linkedIds.length
      ? await tx.select({
          id: chapters.id,
          novelId: chapters.novelId,
          status: chapters.status,
          deletedAt: chapters.deletedAt,
        }).from(chapters).where(inArray(chapters.id, linkedIds))
      : [];
    const linkedById = new Map(linkedPublicChapters.map((chapter) => [chapter.id, chapter]));
    if (!source.linkedNovelId && linkedPublicChapters.length > 0) {
      throw new AdminDataError("IMPORT_NOVEL_LINK_MISSING", "พบบางตอนที่เชื่อมกับ catalog แต่แหล่งนำเข้ายังไม่เชื่อมกับนิยาย กรุณาตรวจสอบข้อมูล", 409);
    }
    if (source.linkedNovelId) {
      const conflicting = readyChapters.find((chapter) => {
        const linked = chapter.linkedChapterId ? linkedById.get(chapter.linkedChapterId) : undefined;
        return linked && linked.novelId !== source.linkedNovelId;
      });
      if (conflicting) {
        throw new AdminDataError("IMPORT_CHAPTER_LINK_CONFLICT", `ตอน ${conflicting.chapterNumber} เชื่อมกับนิยายคนละเรื่อง`, 409);
      }
    }
    const pendingChapters = readyChapters.filter((chapter) => {
      if (!chapter.linkedChapterId) return true;
      const linked = linkedById.get(chapter.linkedChapterId);
      return !linked || linked.deletedAt !== null || linked.status !== "PUBLISHED";
    });
    const importChapters = pendingChapters.slice(0, PUBLISH_BATCH_SIZE);
    const chapterIds = importChapters.map((chapter) => chapter.id);
    const [sourceTexts, chapterTexts, mangaPages] = await Promise.all([
      tx.select().from(novelImportSourceTexts).where(eq(novelImportSourceTexts.sourceId, source.id)),
      tx.select().from(novelImportChapterTexts).where(inArray(novelImportChapterTexts.chapterId, chapterIds)),
      source.contentFormat === "manga"
        ? tx.select({
            chapterId: novelImportMangaPages.chapterId,
            pageNumber: novelImportMangaPages.pageNumber,
            mediaStatus: mediaAssets.status,
            deletedAt: mediaAssets.deletedAt,
          }).from(novelImportMangaPages)
            .innerJoin(mediaAssets, eq(mediaAssets.id, novelImportMangaPages.mediaAssetId))
            .where(inArray(novelImportMangaPages.chapterId, chapterIds))
        : Promise.resolve([]),
    ]);
    const originalMetadata = sourceTexts.find((text) =>
      normalizedLanguage(text.language) === normalizedLanguage(source.sourceLanguage) && text.textKind === "source")
      ?? sourceTexts.find((text) => text.textKind === "source");
    if (!originalMetadata) {
      throw new AdminDataError("IMPORT_METADATA_MISSING", "ไม่พบชื่อเรื่องต้นฉบับ", 409);
    }

    if (source.contentFormat === "manga") {
      const pagesByChapter = new Map<string, typeof mangaPages>();
      for (const page of mangaPages) {
        pagesByChapter.set(page.chapterId, [...(pagesByChapter.get(page.chapterId) ?? []), page]);
      }
      const incomplete = importChapters.find((chapter) => {
        const pages = pagesByChapter.get(chapter.id) ?? [];
        return pages.length === 0 || pages.some((page) => page.mediaStatus !== "READY" || page.deletedAt !== null);
      });
      if (incomplete) {
        throw new AdminDataError("IMPORT_MANGA_NOT_READY", `ภาพของตอน ${incomplete.chapterNumber} ยังอัปโหลดไม่ครบหรือยังไม่ผ่านการตรวจสอบ`, 409);
      }
    }

    let publicNovel = source.linkedNovelId
      ? (await tx.select().from(novels)
          .where(and(eq(novels.id, source.linkedNovelId), isNull(novels.deletedAt)))
          .limit(1).for("no key update"))[0]
      : undefined;
    if (source.linkedNovelId && !publicNovel) {
      throw new AdminDataError("IMPORT_LINKED_NOVEL_MISSING", "นิยายที่เคยเชื่อมไว้ถูกลบหรือไม่พบ กรุณาตรวจสอบก่อนเผยแพร่", 409);
    }
    if (publicNovel?.publicationStatus === "ARCHIVED") {
      throw new AdminDataError("IMPORT_LINKED_NOVEL_ARCHIVED", "นิยายที่เชื่อมไว้ถูกเก็บถาวร กรุณาเปิดใช้งานจากหน้าจัดการนิยายก่อน", 409);
    }

    const selectedLanguage = publicNovel?.language ?? choosePublicationLanguage(
      source.sourceLanguage,
      sourceTexts,
      source.contentFormat,
    );
    if (selectedLanguage.length > 16 || source.sourceLanguage.length > 16) {
      throw new AdminDataError("IMPORT_LANGUAGE_UNSUPPORTED", "รหัสภาษายาวเกินกว่าที่ catalog รองรับ", 409);
    }
    const localizedMetadata = sourceTexts.find((text) =>
      normalizedLanguage(text.language) === normalizedLanguage(selectedLanguage)
      && (normalizedLanguage(selectedLanguage) === normalizedLanguage(source.sourceLanguage)
        ? text.textKind === "source"
        : text.textKind === "translation" && text.translationStatus === "approved")) ?? originalMetadata;

    if (!publicNovel) {
      const slug = await createUniqueSlug(
        localizedMetadata.title,
        async (candidate) => Boolean((await tx.select({ id: novels.id }).from(novels)
          .where(eq(novels.slug, candidate)).limit(1))[0]),
        "novel",
      );
      [publicNovel] = await tx.insert(novels).values({
        slug,
        title: localizedMetadata.title,
        titleOriginal: originalMetadata.title,
        synopsis: localizedMetadata.synopsis?.trim() || originalMetadata.synopsis?.trim() || `นำเข้าจาก ${source.provider}`,
        synopsisOriginal: originalMetadata.synopsis,
        coverKey: source.coverStatus === "ready" ? source.coverKey : null,
        originalLanguage: source.sourceLanguage,
        language: selectedLanguage,
        status: "ONGOING",
        publicationStatus: "PUBLISHED",
        originType: "licensed_translation",
        rightsNote: `เผยแพร่จาก ${source.importReference} โดยผู้ดูแลระบบ`,
        rightsConfirmedAt: now,
        contentPolicyConfirmedAt: now,
        publishedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id,
      }).returning();
      await tx.insert(novelStatistics).values({ novelId: publicNovel.id });
      await tx.insert(novelSearchDocuments).values({
        novelId: publicNovel.id,
        searchText: [publicNovel.title, publicNovel.titleOriginal].filter(Boolean).join(" "),
      });
      await tx.update(novelImportSources).set({ linkedNovelId: publicNovel.id, updatedAt: now })
        .where(eq(novelImportSources.id, source.id));
    } else {
      [publicNovel] = await tx.update(novels).set({
        publicationStatus: "PUBLISHED",
        publishedAt: publicNovel.publishedAt ?? now,
        rightsConfirmedAt: publicNovel.rightsConfirmedAt ?? now,
        contentPolicyConfirmedAt: publicNovel.contentPolicyConfirmedAt ?? now,
        updatedBy: actor.id,
        updatedAt: now,
      }).where(eq(novels.id, publicNovel.id)).returning();
    }

    const chapterTextsByChapter = new Map<string, ImportChapterText[]>();
    for (const text of chapterTexts) {
      chapterTextsByChapter.set(text.chapterId, [...(chapterTextsByChapter.get(text.chapterId) ?? []), text]);
    }
    const [maxSortOrder] = await tx.select({ value: max(chapters.sortOrder) }).from(chapters)
      .where(eq(chapters.novelId, publicNovel.id));
    let nextSortOrder = Number(maxSortOrder?.value ?? 0) + 1;
    let createdChapters = 0;
    let publishedChapters = 0;
    for (const importChapter of importChapters) {
      const text = source.contentFormat === "manga"
        ? undefined
        : chapterTextForLanguage(
            chapterTextsByChapter.get(importChapter.id) ?? [],
            publicNovel.language,
            source.sourceLanguage,
          );
      if (source.contentFormat !== "manga" && !text) {
        throw new AdminDataError(
          "IMPORT_CHAPTER_TEXT_NOT_READY",
          `ตอน ${importChapter.chapterNumber} ยังไม่มีเนื้อหาที่พร้อมเผยแพร่ในภาษา ${publicNovel.language}`,
          409,
        );
      }
      const title = text?.title?.trim() || importChapter.originalTitle?.trim() || `ตอนที่ ${importChapter.chapterNumber}`;
      const content = source.contentFormat === "manga"
        ? `[MANGA:${source.id}:${importChapter.id}]`
        : text!.content!.trim();

      let linkedChapter = importChapter.linkedChapterId
        ? (await tx.select().from(chapters).where(eq(chapters.id, importChapter.linkedChapterId)).limit(1))[0]
        : undefined;
      if (linkedChapter && linkedChapter.novelId !== publicNovel.id) {
        throw new AdminDataError("IMPORT_CHAPTER_LINK_CONFLICT", `ตอน ${importChapter.chapterNumber} เชื่อมกับนิยายคนละเรื่อง`, 409);
      }
      if (!linkedChapter) {
        linkedChapter = (await tx.select().from(chapters)
          .where(and(eq(chapters.novelId, publicNovel.id), eq(chapters.chapterNumber, importChapter.chapterNumber)))
          .limit(1))[0];
      }
      if (linkedChapter?.deletedAt) {
        throw new AdminDataError("IMPORT_CHAPTER_DELETED_CONFLICT", `ตอน ${importChapter.chapterNumber} ชนกับตอนที่ถูกลบไว้`, 409);
      }

      let publicChapterId: string;
      let newlyPublished = false;
      if (!linkedChapter) {
        const slug = await createUniqueSlug(
          `chapter-${importChapter.chapterNumber}-${title}`,
          async (candidate) => Boolean((await tx.select({ id: chapters.id }).from(chapters)
            .where(and(eq(chapters.novelId, publicNovel.id), eq(chapters.slug, candidate))).limit(1))[0]),
          "chapter",
        );
        const [created] = await tx.insert(chapters).values({
          novelId: publicNovel.id,
          chapterNumber: importChapter.chapterNumber,
          sortOrder: nextSortOrder,
          slug,
          title,
          content,
          wordCount: source.contentFormat === "manga" ? 0 : countWords(content),
          status: "PUBLISHED",
          isFree: true,
          accessMode: "free",
          coinPrice: 0,
          publishedAt: now,
          createdBy: actor.id,
          updatedBy: actor.id,
        }).returning({ id: chapters.id });
        publicChapterId = created.id;
        nextSortOrder += 1;
        createdChapters += 1;
        newlyPublished = true;
      } else {
        publicChapterId = linkedChapter.id;
        if (linkedChapter.status !== "PUBLISHED") {
          await tx.update(chapters).set({
            title,
            content,
            wordCount: source.contentFormat === "manga" ? 0 : countWords(content),
            status: "PUBLISHED",
            scheduledFor: null,
            publishedAt: linkedChapter.publishedAt ?? now,
            version: sql`${chapters.version} + 1`,
            updatedBy: actor.id,
            updatedAt: now,
          }).where(eq(chapters.id, linkedChapter.id));
          newlyPublished = true;
        }
      }
      await tx.update(novelImportChapters).set({ linkedChapterId: publicChapterId, updatedAt: now })
        .where(eq(novelImportChapters.id, importChapter.id));
      if (newlyPublished) {
        publishedChapters += 1;
        await tx.insert(domainOutboxEvents).values({
          type: "chapter_published",
          aggregateType: "chapter",
          aggregateId: publicChapterId,
          dedupeKey: `import-published:${importChapter.id}`,
          payload: { chapterId: publicChapterId, novelId: publicNovel.id, importSourceId: source.id },
        }).onConflictDoNothing();
      }
    }

    await tx.insert(novelSearchDocuments).values({
      novelId: publicNovel.id,
      searchText: [publicNovel.title, publicNovel.titleOriginal].filter(Boolean).join(" "),
    }).onConflictDoUpdate({
      target: novelSearchDocuments.novelId,
      set: { searchText: [publicNovel.title, publicNovel.titleOriginal].filter(Boolean).join(" "), updatedAt: now },
    });
    await syncPublishedNovelStatistics(tx, publicNovel.id, now);
    await tx.insert(adminAuditLogs).values({
      actorId: actor.id,
      actorRole: actor.role,
      action: "import.publish",
      entityType: "import_source",
      entityId: source.id,
      before: { linkedNovelId: source.linkedNovelId },
      after: {
        linkedNovelId: publicNovel.id,
        novelSlug: publicNovel.slug,
        checkpoint: source.lastSuccessfulChapter,
        processedChapters: importChapters.length,
        remainingChapters: Math.max(0, pendingChapters.length - importChapters.length),
        createdChapters,
        publishedChapters,
      },
    });
    return {
      novelId: publicNovel.id,
      novelSlug: publicNovel.slug,
      readyChapters: readyChapters.length,
      processedChapters: importChapters.length,
      remainingChapters: Math.max(0, pendingChapters.length - importChapters.length),
      createdChapters,
      publishedChapters,
    };
  });

  await invalidateChapterCache(result.novelSlug);
  for (const tag of ["public-novels", "public-chapters", "public-search", "public-rankings", "public-sitemap"]) {
    revalidateTag(tag, { expire: 0 });
  }
  revalidatePath("/");
  revalidatePath("/admin/imports");
  revalidatePath(`/admin/imports/${sourceId}`);
  revalidatePath(`/novel/${result.novelSlug}`);
  revalidatePath(`/novel/${result.novelSlug}/chapters`);
  return result;
}
