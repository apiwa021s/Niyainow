import "server-only";

import { and, asc, count, countDistinct, desc, eq, exists, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import {
  novelImportChapters,
  novelImportChapterTexts,
  novelImportSources,
  novelImportSourceTexts,
} from "@/db/schema";
import { assertAdmin } from "@/lib/auth/dal";
import { assetUrl } from "@/lib/site-config";

const PAGE_SIZE = 30;
const sourceIdSchema = z.uuid();
const SOURCE_STATUSES = ["ready", "paused", "blocked", "error"] as const;
const COVER_STATUSES = ["missing", "pending", "ready", "error"] as const;

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
  const [sourceTexts, chapterRows, chapterTotals] = await Promise.all([
    db.select().from(novelImportSourceTexts)
      .where(eq(novelImportSourceTexts.sourceId, source.id))
      .orderBy(asc(novelImportSourceTexts.language)),
    db.select().from(novelImportChapters)
      .where(eq(novelImportChapters.sourceId, source.id))
      .orderBy(desc(novelImportChapters.chapterNumber))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ value: count() }).from(novelImportChapters)
      .where(eq(novelImportChapters.sourceId, source.id)),
  ]);
  const chapterIds = chapterRows.map(({ id }) => id);
  const chapterTexts = chapterIds.length
    ? await db.select({
        chapterId: novelImportChapterTexts.chapterId,
        language: novelImportChapterTexts.language,
        textKind: novelImportChapterTexts.textKind,
        translationStatus: novelImportChapterTexts.translationStatus,
        title: novelImportChapterTexts.title,
        contentLength: sql<number>`length(coalesce(${novelImportChapterTexts.content}, ''))`.mapWith(Number),
        version: novelImportChapterTexts.version,
      }).from(novelImportChapterTexts)
        .where(inArray(novelImportChapterTexts.chapterId, chapterIds))
        .orderBy(asc(novelImportChapterTexts.language))
    : [];
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

  return {
    ...hydratedSource,
    seedUrl: source.seedUrl,
    coverSourceUrl: source.coverSourceUrl,
    coverError: source.coverError,
    blockedReason: source.blockedReason,
    metadata: source.metadata,
    createdAt: source.createdAt.toISOString(),
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
        fetchedAt: chapter.fetchedAt.toISOString(),
        linkedChapterId: chapter.linkedChapterId,
        texts: textsByChapter.get(chapter.id) ?? [],
      })),
      page,
      total: chapterTotal,
      totalPages: Math.max(1, Math.ceil(chapterTotal / PAGE_SIZE)),
    },
  } satisfies AdminImportSourceDetail;
}
