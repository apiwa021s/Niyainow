import "server-only";

import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  and,
  asc,
  countDistinct,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  not,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { getDb } from "@/db";
import {
  authors,
  chapters,
  genres,
  novelAuthors,
  novelGenres,
  novelDailyStats,
  novelRankings,
  novelSearchDocuments,
  novelStatistics,
  novelTags,
  novels,
  promoBanners,
  ratings,
  reviews,
  tags,
  users,
} from "@/db/schema";
import { assetUrl } from "@/lib/site-config";
import { bangkokDateKey } from "@/lib/domain/public-view";
import type { ChapterSummary, Genre, Novel, Paginated, Review, UpdateItem } from "@/types/novel";
import {
  BROWSE_PAGE_SIZE,
  CHAPTER_PAGE_SIZE,
  parseGenreParam,
  parsePositivePage,
  type NovelQuery,
  type NovelSort,
} from "@/types/novel-query";

export type {
  ChapterRange,
  ContentFilter,
  NovelQuery,
  NovelSort,
  RatingFilter,
  UpdatedFilter,
} from "@/types/novel-query";
export { parseGenreParam } from "@/types/novel-query";

const PUBLIC_CACHE_SECONDS = 300;
const SEARCH_LIMIT = 18;
const SUGGESTION_LIMIT = 8;
const MAX_LIST_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;
const latestChapters = alias(chapters, "latest_chapters");

export type GenreFacet = Genre & { matches: number };

export type TagSummary = {
  slug: string;
  name: string;
  description: string;
  count: number;
};

export type PublicSearchResult = {
  novels: Novel[];
  genres: Genre[];
  tags: TagSummary[];
  page: number;
  total: number;
  totalPages: number;
};

export type SearchSuggestion = {
  label: string;
  meta: string;
  href: string;
};

export type NovelUpdate = UpdateItem & {
  novel: Novel;
  publishedAt: string;
};

export type RankingPeriod = "DAILY" | "WEEKLY" | "MONTHLY" | "ALL_TIME";

type NormalizedNovelQuery = {
  genre?: string;
  tag?: string;
  status?: "ongoing" | "completed" | "hiatus";
  rating?: "4.5" | "4" | "3.5";
  chapters?: "under-50" | "50-200" | "200-500" | "500+";
  updated?: "today" | "7d" | "30d";
  content?: "free" | "paid";
  sort: NovelSort;
  q?: string;
  page: number;
};

type BaseNovelRow = {
  id: string;
  slug: string;
  title: string;
  titleOriginal: string | null;
  synopsis: string;
  coverKey: string | null;
  bannerKey: string | null;
  status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED";
  isFeatured: boolean;
  latestChapterAt: Date | null;
  publishedAt: Date | null;
  createdAt: Date;
  views: number;
  chapters: number;
  rating: number;
  ratingCount: number;
  bookmarkCount: number;
  latestChapterNumber: number | null;
  latestChapterTitle: string | null;
};

function clampLimit(value: number | undefined, fallback: number, maximum = MAX_LIST_LIMIT) {
  if (!Number.isSafeInteger(value) || !value || value < 1) return fallback;
  return Math.min(value, maximum);
}

function cleanText(value: unknown, maximum = MAX_SEARCH_LENGTH) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/\s+/gu, " ").trim().slice(0, maximum);
  return normalized || undefined;
}

function normalizeNovelQuery(query: NovelQuery = {}): NormalizedNovelQuery {
  const status = ["ongoing", "completed", "hiatus"].includes(String(query.status))
    ? (query.status as NormalizedNovelQuery["status"])
    : undefined;
  const rating = ["4.5", "4", "3.5"].includes(String(query.rating))
    ? (query.rating as NormalizedNovelQuery["rating"])
    : undefined;
  const chapterRange = ["under-50", "50-200", "200-500", "500+"].includes(String(query.chapters))
    ? (query.chapters as NormalizedNovelQuery["chapters"])
    : undefined;
  const updated = ["today", "7d", "30d"].includes(String(query.updated))
    ? (query.updated as NormalizedNovelQuery["updated"])
    : undefined;
  const content = ["free", "paid"].includes(String(query.content))
    ? (query.content as NormalizedNovelQuery["content"])
    : undefined;
  const sort = ["popular", "updated", "rating", "new", "chapters"].includes(String(query.sort))
    ? (query.sort as NovelSort)
    : "popular";

  return {
    genre: parseGenreParam(cleanText(query.genre, 500)).join(",") || undefined,
    tag: cleanText(query.tag, 120),
    status,
    rating,
    chapters: chapterRange,
    updated,
    content,
    sort,
    q: cleanText(query.q),
    page: parsePositivePage(query.page),
  };
}

function publicNovelCondition(now: Date) {
  return and(
    eq(novels.publicationStatus, "PUBLISHED"),
    isNull(novels.deletedAt),
    lte(novels.publishedAt, now),
  );
}

function publicChapterCondition(now: Date) {
  return and(eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt), lte(chapters.publishedAt, now));
}

function safeSearchPattern(value: string) {
  return `%${value.replace(/[%_\\]/gu, " ")}%`;
}

function searchCondition(term: string) {
  const db = getDb();
  const pattern = safeSearchPattern(term);

  return exists(
    db
      .select({ novelId: novelSearchDocuments.novelId })
      .from(novelSearchDocuments)
      .where(
        and(
          eq(novelSearchDocuments.novelId, novels.id),
          ilike(novelSearchDocuments.searchText, pattern),
        ),
      ),
  );
}

function queryCondition(query: NormalizedNovelQuery, now: Date, includeGenre = true) {
  const db = getDb();
  const conditions: SQL[] = [publicNovelCondition(now)!];
  const selectedGenres = parseGenreParam(query.genre);

  if (includeGenre && selectedGenres.length > 0) {
    conditions.push(
      exists(
        db
          .select({ novelId: novelGenres.novelId })
          .from(novelGenres)
          .innerJoin(genres, eq(genres.id, novelGenres.genreId))
          .where(
            and(
              eq(novelGenres.novelId, novels.id),
              eq(genres.isActive, true),
              inArray(genres.slug, selectedGenres),
            ),
          ),
      ),
    );
  }

  if (query.tag) {
    conditions.push(
      exists(
        db
          .select({ novelId: novelTags.novelId })
          .from(novelTags)
          .innerJoin(tags, eq(tags.id, novelTags.tagId))
          .where(
            and(
              eq(novelTags.novelId, novels.id),
              eq(tags.isActive, true),
              or(eq(tags.slug, query.tag), ilike(tags.name, query.tag)),
            ),
          ),
      ),
    );
  }

  if (query.status === "ongoing") conditions.push(eq(novels.status, "ONGOING"));
  if (query.status === "completed") conditions.push(eq(novels.status, "COMPLETED"));
  if (query.status === "hiatus") conditions.push(inArray(novels.status, ["HIATUS", "CANCELLED"]));
  if (query.rating) conditions.push(gte(novelStatistics.ratingAverage, Number(query.rating)));

  const publishedChapters = sql<number>`coalesce(${novelStatistics.publishedChapters}, 0)`;
  if (query.chapters === "under-50") conditions.push(sql`${publishedChapters} < 50`);
  if (query.chapters === "50-200") conditions.push(sql`${publishedChapters} between 50 and 200`);
  if (query.chapters === "200-500") conditions.push(sql`${publishedChapters} > 200 and ${publishedChapters} <= 500`);
  if (query.chapters === "500+") conditions.push(sql`${publishedChapters} > 500`);

  if (query.updated) {
    const days = query.updated === "today" ? 1 : query.updated === "7d" ? 7 : 30;
    const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1_000);
    conditions.push(gte(novels.latestChapterAt, threshold));
  }

  const hasPaidChapter = exists(
    db
      .select({ id: chapters.id })
      .from(chapters)
      .where(
        and(
          eq(chapters.novelId, novels.id),
          publicChapterCondition(now),
          eq(chapters.isFree, false),
        ),
      ),
  );
  if (query.content === "paid") conditions.push(hasPaidChapter);
  if (query.content === "free") conditions.push(not(hasPaidChapter));
  if (query.q && query.q.length >= 2) conditions.push(searchCondition(query.q)!);

  return and(...conditions)!;
}

function orderBy(sort: NovelSort): SQL[] {
  if (sort === "updated") {
    return [desc(sql`coalesce(${novels.latestChapterAt}, ${novels.publishedAt})`), desc(sql`${novels.id}`)];
  }
  if (sort === "rating") {
    return [
      desc(sql`coalesce(${novelStatistics.ratingAverage}, 0)`),
      desc(sql`coalesce(${novelStatistics.ratingCount}, 0)`),
      desc(sql`${novels.id}`),
    ];
  }
  if (sort === "new") return [desc(sql`${novels.publishedAt}`), desc(sql`${novels.id}`)];
  if (sort === "chapters") {
    return [desc(sql`coalesce(${novelStatistics.publishedChapters}, 0)`), desc(sql`${novels.id}`)];
  }
  return [
    desc(sql`coalesce(${novelStatistics.viewCount}, 0)`),
    desc(sql`coalesce(${novelStatistics.ratingAverage}, 0)`),
    desc(sql`${novels.id}`),
  ];
}

const novelSelection = {
  id: novels.id,
  slug: novels.slug,
  title: novels.title,
  titleOriginal: novels.titleOriginal,
  synopsis: novels.synopsis,
  coverKey: novels.coverKey,
  bannerKey: novels.bannerKey,
  status: novels.status,
  isFeatured: novels.isFeatured,
  latestChapterAt: novels.latestChapterAt,
  publishedAt: novels.publishedAt,
  createdAt: novels.createdAt,
  views: sql<number>`coalesce(${novelStatistics.viewCount}, 0)`.mapWith(Number),
  chapters: sql<number>`coalesce(${novelStatistics.publishedChapters}, 0)`.mapWith(Number),
  rating: sql<number>`coalesce(${novelStatistics.ratingAverage}, 0)`.mapWith(Number),
  ratingCount: sql<number>`coalesce(${novelStatistics.ratingCount}, 0)`.mapWith(Number),
  bookmarkCount: sql<number>`coalesce(${novelStatistics.libraryCount}, 0)`.mapWith(Number),
  latestChapterNumber: latestChapters.chapterNumber,
  latestChapterTitle: latestChapters.title,
};

async function selectBaseNovels(where: SQL, sorting: SQL[], limit: number, offset = 0): Promise<BaseNovelRow[]> {
  return getDb()
    .select(novelSelection)
    .from(novels)
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .leftJoin(
      latestChapters,
      and(
        eq(latestChapters.id, novelStatistics.latestChapterId),
        eq(latestChapters.status, "PUBLISHED"),
        isNull(latestChapters.deletedAt),
        lte(latestChapters.publishedAt, new Date()),
      ),
    )
    .where(where)
    .orderBy(...sorting)
    .limit(limit)
    .offset(offset);
}

function toPublicStatus(status: BaseNovelRow["status"]): Novel["status"] {
  if (status === "COMPLETED") return "completed";
  if (status === "HIATUS" || status === "CANCELLED") return "hiatus";
  return "ongoing";
}

function formatThaiDate(value: Date | null) {
  if (!value) return "ยังไม่มีอัปเดต";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function formatRelativeTime(value: Date, now = new Date()) {
  const minutes = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 60_000));
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาที`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชม.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วัน`;
  return formatThaiDate(value);
}

function startOfBangkokDay(value: Date) {
  const bangkokOffset = 7 * 60 * 60 * 1_000;
  const shifted = new Date(value.getTime() + bangkokOffset);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - bangkokOffset);
}

async function hydrateNovels(rows: BaseNovelRow[]): Promise<Novel[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const db = getDb();
  const now = new Date();

  const [genreRows, tagRows, authorRows, paidRows] = await Promise.all([
    db
      .select({
        novelId: novelGenres.novelId,
        slug: genres.slug,
        name: genres.name,
        thaiName: genres.thaiName,
        sortOrder: novelGenres.sortOrder,
      })
      .from(novelGenres)
      .innerJoin(genres, eq(genres.id, novelGenres.genreId))
      .where(and(inArray(novelGenres.novelId, ids), eq(genres.isActive, true)))
      .orderBy(asc(novelGenres.sortOrder), asc(genres.name)),
    db
      .select({ novelId: novelTags.novelId, slug: tags.slug })
      .from(novelTags)
      .innerJoin(tags, eq(tags.id, novelTags.tagId))
      .where(and(inArray(novelTags.novelId, ids), eq(tags.isActive, true)))
      .orderBy(asc(tags.name)),
    db
      .select({
        novelId: novelAuthors.novelId,
        role: novelAuthors.role,
        name: authors.name,
        sortOrder: novelAuthors.sortOrder,
      })
      .from(novelAuthors)
      .innerJoin(authors, eq(authors.id, novelAuthors.authorId))
      .where(inArray(novelAuthors.novelId, ids))
      .orderBy(asc(novelAuthors.sortOrder), asc(authors.name)),
    db
      .selectDistinct({ novelId: chapters.novelId })
      .from(chapters)
      .where(
        and(
          inArray(chapters.novelId, ids),
          publicChapterCondition(now),
          eq(chapters.isFree, false),
        ),
      ),
  ]);

  const genreMap = new Map<string, typeof genreRows>();
  const tagMap = new Map<string, string[]>();
  const authorMap = new Map<string, typeof authorRows>();
  const paid = new Set(paidRows.map((row) => row.novelId));

  for (const row of genreRows) genreMap.set(row.novelId, [...(genreMap.get(row.novelId) ?? []), row]);
  for (const row of tagRows) tagMap.set(row.novelId, [...(tagMap.get(row.novelId) ?? []), row.slug]);
  for (const row of authorRows) authorMap.set(row.novelId, [...(authorMap.get(row.novelId) ?? []), row]);

  return rows.map((row) => {
    const novelGenresForRow = genreMap.get(row.id) ?? [];
    const people = authorMap.get(row.id) ?? [];
    const primaryAuthor = people.find((person) => person.role === "AUTHOR" || person.role === "ORIGINAL_AUTHOR");
    const translator = people.find((person) => person.role === "TRANSLATOR");
    const cover = assetUrl(row.coverKey);
    const latestDate = row.latestChapterAt ?? row.publishedAt;
    const hoursAgo = latestDate ? Math.max(0, Math.floor((Date.now() - latestDate.getTime()) / 3_600_000)) : undefined;

    return {
      id: row.id,
      slug: row.slug,
      title: row.titleOriginal ?? row.title,
      thaiTitle: row.title,
      author: primaryAuthor?.name ?? "ไม่ระบุผู้แต่ง",
      translator: translator?.name,
      genres: novelGenresForRow.map((genre) => genre.slug),
      genreNames: Object.fromEntries(
        novelGenresForRow.map((genre) => [genre.slug, genre.thaiName || genre.name]),
      ),
      tags: tagMap.get(row.id) ?? [],
      status: toPublicStatus(row.status),
      rating: Number(row.rating.toFixed(2)),
      ratingCount: row.ratingCount,
      views: row.views,
      chapters: row.chapters,
      synopsis: row.synopsis,
      cover,
      backdrop: assetUrl(row.bannerKey, cover),
      updatedAt: formatThaiDate(latestDate),
      updatedHoursAgo: hoursAgo,
      publishedAt: row.publishedAt?.toISOString(),
      featured: row.isFeatured,
      completed: row.status === "COMPLETED",
      bookmarkCount: row.bookmarkCount,
      latestChapterTitle: row.latestChapterTitle ?? undefined,
      latestChapter:
        row.latestChapterNumber !== null && row.latestChapterTitle
          ? { number: row.latestChapterNumber, title: row.latestChapterTitle }
          : undefined,
      isNew: Boolean(row.publishedAt && Date.now() - row.publishedAt.getTime() <= 7 * 24 * 60 * 60 * 1_000),
      hasPaidChapters: paid.has(row.id),
    } satisfies Novel;
  });
}

async function getNovelPageNormalized(query: NormalizedNovelQuery): Promise<Paginated<Novel>> {
  const now = new Date();
  const where = queryCondition(query, now);
  const db = getDb();
  const countRows = await db
    .select({ value: countDistinct(novels.id) })
    .from(novels)
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .where(where);
  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const rows = await selectBaseNovels(where, orderBy(query.sort), BROWSE_PAGE_SIZE, (page - 1) * BROWSE_PAGE_SIZE);

  return {
    items: await hydrateNovels(rows),
    page,
    pageSize: BROWSE_PAGE_SIZE,
    total,
    totalPages,
  };
}

async function getNovelPageUncached(queryInput: NovelQuery = {}) {
  return getNovelPageNormalized(normalizeNovelQuery(queryInput));
}

const getNovelPageCached = unstable_cache(getNovelPageNormalized, ["public-novel-page-v3"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: ["public-novels"],
});

export async function getNovelPage(queryInput: NovelQuery = {}) {
  const query = normalizeNovelQuery(queryInput);
  // Free-text search is attacker-cardinality input and must not create a
  // persistent incremental-cache entry for every distinct query.
  return query.q || query.genre || query.tag
    ? getNovelPageNormalized(query)
    : getNovelPageCached(query);
}

async function getNovelsUncached(queryInput: NovelQuery = {}, requestedLimit = MAX_LIST_LIMIT) {
  const query = normalizeNovelQuery(queryInput);
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT);
  const rows = await selectBaseNovels(queryCondition(query, new Date()), orderBy(query.sort), limit);
  return hydrateNovels(rows);
}

export const getNovels = cache(getNovelsUncached);

const resolvePublishedNovelId = cache(async (slugInput: string) => {
  const slug = cleanText(slugInput, 180);
  if (!slug) return undefined;
  const [row] = await getDb()
    .select({ id: novels.id })
    .from(novels)
    .where(and(publicNovelCondition(new Date()), eq(novels.slug, slug)))
    .limit(1);
  return row?.id;
});

const getNovelByIdCached = unstable_cache(async (id: string) => {
  const rows = await selectBaseNovels(
    and(publicNovelCondition(new Date()), eq(novels.id, id))!,
    [desc(sql`${novels.id}`)],
    1,
  );
  return (await hydrateNovels(rows))[0];
}, ["public-novel-by-id-v3"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: ["public-novels"],
});

export const getNovelBySlug = cache(async (slugInput: string) => {
  const id = await resolvePublishedNovelId(slugInput);
  return id ? getNovelByIdCached(id) : undefined;
});

export const getFeaturedNovels = unstable_cache(
  async (requestedLimit = 6) => {
    const limit = clampLimit(requestedLimit, 6, 12);
    const rows = await selectBaseNovels(
      and(publicNovelCondition(new Date()), eq(novels.isFeatured, true))!,
      orderBy("updated"),
      limit,
    );
    return hydrateNovels(rows);
  },
  ["public-featured-novels-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

export const getRecommendedNovels = unstable_cache(
  async (requestedLimit = 12) => {
    const limit = clampLimit(requestedLimit, 12, 24);
    const rows = await selectBaseNovels(publicNovelCondition(new Date())!, orderBy("rating"), limit);
    return hydrateNovels(rows);
  },
  ["public-recommended-novels-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

export const getNewThisWeek = unstable_cache(
  async (requestedLimit = 12) => {
    const limit = clampLimit(requestedLimit, 12, 24);
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);
    const rows = await selectBaseNovels(
      and(publicNovelCondition(new Date()), gte(novels.publishedAt, threshold))!,
      orderBy("new"),
      limit,
    );
    return hydrateNovels(rows);
  },
  ["public-new-this-week-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

export const getCompletedNovels = unstable_cache(
  async (requestedLimit = 12) => {
    const limit = clampLimit(requestedLimit, 12, 24);
    const rows = await selectBaseNovels(
      and(publicNovelCondition(new Date()), eq(novels.status, "COMPLETED"))!,
      orderBy("rating"),
      limit,
    );
    return hydrateNovels(rows);
  },
  ["public-completed-novels-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

async function getGenresUncached(requestedLimit = MAX_LIST_LIMIT): Promise<Genre[]> {
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT, 200);
  const now = new Date();
  const rows = await getDb()
    .select({
      slug: genres.slug,
      name: genres.name,
      thaiName: genres.thaiName,
      description: genres.description,
      count: countDistinct(novels.id),
    })
    .from(genres)
    .leftJoin(novelGenres, eq(novelGenres.genreId, genres.id))
    .leftJoin(
      novels,
      and(eq(novels.id, novelGenres.novelId), publicNovelCondition(now)),
    )
    .where(eq(genres.isActive, true))
    .groupBy(genres.id)
    .orderBy(asc(genres.sortOrder), asc(genres.name))
    .limit(limit);

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    thaiName: row.thaiName || row.name,
    description: row.description || "",
    count: Number(row.count),
  }));
}

export type PromoBannerItem = {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  linkUrl: string | null;
  ctaLabel: string | null;
};

/**
 * Banners for the home page. The schedule window is evaluated per request, so
 * the cache is short-lived: a banner must not outlive `endsAt` by a full
 * revalidate period.
 */
export const getActiveBanners = unstable_cache(
  async (limit = 6): Promise<PromoBannerItem[]> => {
    const now = new Date();
    const rows = await getDb()
      .select()
      .from(promoBanners)
      .where(
        and(
          eq(promoBanners.isActive, true),
          or(isNull(promoBanners.startsAt), lte(promoBanners.startsAt, now)),
          or(isNull(promoBanners.endsAt), gte(promoBanners.endsAt, now)),
        ),
      )
      .orderBy(asc(promoBanners.sortOrder), desc(promoBanners.createdAt))
      .limit(Math.min(Math.max(limit, 1), MAX_LIST_LIMIT));
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      image: assetUrl(row.imageKey),
      linkUrl: row.linkUrl,
      ctaLabel: row.ctaLabel,
    }));
  },
  ["public-banners-v1"],
  { revalidate: 60, tags: ["public-banners"] },
);

export const getGenres = unstable_cache(getGenresUncached, ["public-genres-v2"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: ["public-taxonomy", "public-novels"],
});

const resolveActiveGenreId = cache(async (slugInput: string) => {
  const slug = cleanText(slugInput, 120);
  if (!slug) return undefined;
  const [row] = await getDb()
    .select({ id: genres.id })
    .from(genres)
    .where(and(eq(genres.isActive, true), eq(genres.slug, slug)))
    .limit(1);
  return row?.id;
});

const getGenreByIdCached = unstable_cache(
  async (id: string) => {
    const rows = await getDb()
      .select({
        slug: genres.slug,
        name: genres.name,
        thaiName: genres.thaiName,
        description: genres.description,
        count: countDistinct(novels.id),
      })
      .from(genres)
      .leftJoin(novelGenres, eq(novelGenres.genreId, genres.id))
      .leftJoin(
        novels,
        and(eq(novels.id, novelGenres.novelId), publicNovelCondition(new Date())),
      )
      .where(and(eq(genres.isActive, true), eq(genres.id, id)))
      .groupBy(genres.id)
      .limit(1);
    const row = rows[0];
    return row ? {
      slug: row.slug,
      name: row.name,
      thaiName: row.thaiName || row.name,
      description: row.description || "",
      count: Number(row.count),
    } : undefined;
  },
  ["public-genre-by-id-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-taxonomy", "public-novels"] },
);

export const getGenreBySlug = cache(async (slugInput: string) => {
  const id = await resolveActiveGenreId(slugInput);
  return id ? getGenreByIdCached(id) : undefined;
});

async function getGenreFacetsNormalized(query: NormalizedNovelQuery): Promise<GenreFacet[]> {
    const now = new Date();
    const [allGenres, matches] = await Promise.all([
      getGenresUncached(200),
      getDb()
        .select({ slug: genres.slug, count: countDistinct(novels.id) })
        .from(genres)
        .innerJoin(novelGenres, eq(novelGenres.genreId, genres.id))
        .innerJoin(novels, eq(novels.id, novelGenres.novelId))
        .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
        .where(and(eq(genres.isActive, true), queryCondition(query, now, false)))
        .groupBy(genres.id),
    ]);
    const countBySlug = new Map(matches.map((row) => [row.slug, Number(row.count)]));
    return allGenres.map((genre) => ({ ...genre, matches: countBySlug.get(genre.slug) ?? 0 }));
}

const getGenreFacetsCached = unstable_cache(
  getGenreFacetsNormalized,
  ["public-genre-facets-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-taxonomy", "public-novels"] },
);

export async function getGenreFacets(queryInput: NovelQuery = {}) {
  const query = normalizeNovelQuery(queryInput);
  return query.q || query.genre || query.tag
    ? getGenreFacetsNormalized(query)
    : getGenreFacetsCached(query);
}

async function getTagsUncached(searchInput?: string, requestedLimit = MAX_LIST_LIMIT): Promise<TagSummary[]> {
  const search = cleanText(searchInput);
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT, 200);
  const where = search
    ? and(eq(tags.isActive, true), or(ilike(tags.name, safeSearchPattern(search)), ilike(tags.slug, safeSearchPattern(search))))
    : eq(tags.isActive, true);
  const rows = await getDb()
    .select({ slug: tags.slug, name: tags.name, description: tags.description, count: countDistinct(novels.id) })
    .from(tags)
    .leftJoin(novelTags, eq(novelTags.tagId, tags.id))
    .leftJoin(
      novels,
      and(eq(novels.id, novelTags.novelId), publicNovelCondition(new Date())),
    )
    .where(where)
    .groupBy(tags.id)
    .orderBy(desc(countDistinct(novels.id)), asc(tags.name))
    .limit(limit);
  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description || "",
    count: Number(row.count),
  }));
}

const getTagsCached = unstable_cache(
  (limit: number) => getTagsUncached(undefined, limit),
  ["public-tags-v3"],
  {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: ["public-taxonomy"],
  },
);

export async function getTags(searchInput?: string, requestedLimit = MAX_LIST_LIMIT) {
  const search = cleanText(searchInput);
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT, 200);
  return search ? getTagsUncached(search, limit) : getTagsCached(limit);
}

const resolveActiveTagId = cache(async (slugInput: string) => {
  const slug = cleanText(slugInput, 120);
  if (!slug) return undefined;
  const [row] = await getDb()
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.isActive, true), eq(tags.slug, slug)))
    .limit(1);
  return row?.id;
});

const getTagByIdCached = unstable_cache(
  async (id: string) => {
    const rows = await getDb()
      .select({ slug: tags.slug, name: tags.name, description: tags.description, count: countDistinct(novels.id) })
      .from(tags)
      .leftJoin(novelTags, eq(novelTags.tagId, tags.id))
      .leftJoin(
        novels,
        and(eq(novels.id, novelTags.novelId), publicNovelCondition(new Date())),
      )
      .where(and(eq(tags.isActive, true), eq(tags.id, id)))
      .groupBy(tags.id)
      .limit(1);
    const row = rows[0];
    return row
      ? { slug: row.slug, name: row.name, description: row.description || "", count: Number(row.count) }
      : undefined;
  },
  ["public-tag-by-id-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-taxonomy"] },
);

export const getTagBySlug = cache(async (slugInput: string) => {
  const id = await resolveActiveTagId(slugInput);
  return id ? getTagByIdCached(id) : undefined;
});

export async function searchNovels(searchInput: string, pageInput = 1): Promise<PublicSearchResult> {
    const q = cleanText(searchInput);
    const page = parsePositivePage(pageInput);
    if (!q || q.length < 2) return { novels: [], genres: [], tags: [], page: 1, total: 0, totalPages: 1 };
    const novelPage = await getNovelPageUncached({ q, page });
    const pattern = safeSearchPattern(q);
    const [genreRows, tagRows] = await Promise.all([
      getDb()
        .select({
          slug: genres.slug,
          name: genres.name,
          thaiName: genres.thaiName,
          description: genres.description,
        })
        .from(genres)
        .where(
          and(
            eq(genres.isActive, true),
            or(ilike(genres.name, pattern), ilike(genres.thaiName, pattern), ilike(genres.slug, pattern)),
          ),
        )
        .orderBy(asc(genres.sortOrder), asc(genres.name))
        .limit(SUGGESTION_LIMIT),
      getTagsUncached(q, SUGGESTION_LIMIT),
    ]);

    return {
      novels: novelPage.items.slice(0, SEARCH_LIMIT),
      genres: genreRows.map((row) => ({
        slug: row.slug,
        name: row.name,
        thaiName: row.thaiName || row.name,
        description: row.description || "",
        count: 0,
      })),
      tags: tagRows,
      page: novelPage.page,
      total: novelPage.total,
      totalPages: novelPage.totalPages,
    };
}

export async function getSearchSuggestions(searchInput: string): Promise<SearchSuggestion[]> {
  const results = await searchNovels(searchInput, 1);
  return [
    ...results.novels.slice(0, 5).map((novel) => ({
      label: novel.thaiTitle,
      meta: novel.title,
      href: `/novel/${novel.slug}`,
    })),
    ...results.genres.slice(0, 2).map((genre) => ({
      label: genre.thaiName,
      meta: "หมวดหมู่",
      href: `/genre/${genre.slug}`,
    })),
    ...results.tags.slice(0, 2).map((tag) => ({
      label: tag.name,
      meta: "แท็ก",
      href: `/tag/${tag.slug}`,
    })),
  ].slice(0, SUGGESTION_LIMIT);
}

export const getRankings = unstable_cache(
  async (periodInput: RankingPeriod = "WEEKLY", requestedLimit = MAX_LIST_LIMIT) => {
    const period: RankingPeriod = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"].includes(periodInput)
      ? periodInput
      : "WEEKLY";
    const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT);
    const db = getDb();
    const now = new Date();
    const latestPeriod = await db
      .select({ periodStart: novelRankings.periodStart })
      .from(novelRankings)
      .where(eq(novelRankings.period, period))
      .orderBy(desc(novelRankings.periodStart))
      .limit(1);
    const periodStart = latestPeriod[0]?.periodStart;

    if (periodStart) {
      const rankingRows = await db
        .select({ id: novels.id, rank: novelRankings.rank })
        .from(novelRankings)
        .innerJoin(novels, eq(novels.id, novelRankings.novelId))
        .where(
          and(
            eq(novelRankings.period, period),
            eq(novelRankings.periodStart, periodStart),
            publicNovelCondition(now),
          ),
        )
        .orderBy(asc(novelRankings.rank))
        .limit(limit);
      if (rankingRows.length > 0) {
        const ids = rankingRows.map((row) => row.id);
        const rows = await selectBaseNovels(
          and(publicNovelCondition(now), inArray(novels.id, ids))!,
          orderBy("popular"),
          limit,
        );
        const hydrated = await hydrateNovels(rows);
        const byId = new Map(hydrated.map((novel) => [novel.id, novel]));
        return rankingRows.flatMap((row) => {
          const novel = byId.get(row.id);
          return novel ? [novel] : [];
        });
      }
    }

    if (period !== "ALL_TIME") {
      const windowDays = period === "DAILY" ? 1 : period === "WEEKLY" ? 7 : 30;
      const periodStart = bangkokDateKey(new Date(now.getTime() - (windowDays - 1) * 86_400_000));
      const periodEnd = bangkokDateKey(now);
      const score = sql<number>`
        ln(1 + coalesce(sum(${novelDailyStats.views}), 0)) * 1.5 +
        ln(1 + coalesce(sum(${novelDailyStats.uniqueReaders}), 0)) * 3 +
        ln(1 + coalesce(sum(${novelDailyStats.chapterReads}), 0)) * 2 +
        ln(1 + coalesce(sum(${novelDailyStats.libraryAdds}), 0)) * 6 +
        ln(1 + coalesce(sum(${novelDailyStats.ratings}), 0)) * 4
      `.mapWith(Number);
      const aggregateRows = await db
        .select({ id: novels.id, score })
        .from(novelDailyStats)
        .innerJoin(novels, eq(novels.id, novelDailyStats.novelId))
        .where(
          and(
            gte(novelDailyStats.statDate, periodStart),
            lte(novelDailyStats.statDate, periodEnd),
            publicNovelCondition(now),
          ),
        )
        .groupBy(novels.id)
        .orderBy(desc(score), asc(novels.id))
        .limit(limit);
      if (aggregateRows.length === 0) return [];

      const ids = aggregateRows.map((row) => row.id);
      const rows = await selectBaseNovels(
        and(publicNovelCondition(now), inArray(novels.id, ids))!,
        orderBy("popular"),
        limit,
      );
      const hydrated = await hydrateNovels(rows);
      const byId = new Map(hydrated.map((novel) => [novel.id, novel]));
      return aggregateRows.flatMap((row) => {
        const novel = byId.get(row.id);
        return novel ? [novel] : [];
      });
    }

    const allTimeRows = await selectBaseNovels(publicNovelCondition(now)!, orderBy("popular"), limit);
    return hydrateNovels(allTimeRows);
  },
  ["public-rankings-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-rankings", "public-novels"] },
);

export const getGenreShowcase = unstable_cache(
  async (requestedLimit = 8) => {
    const limit = clampLimit(requestedLimit, 8, 12);
    const publicGenres = await getGenresUncached(limit);
    if (publicGenres.length === 0) return [];
    const slugs = publicGenres.map((genre) => genre.slug);
    const rankedCovers = getDb()
      .select({
        genreSlug: genres.slug,
        genreOrder: genres.sortOrder,
        coverKey: novels.coverKey,
        coverRank: sql<number>`row_number() over (
          partition by ${genres.id}
          order by coalesce(${novels.latestChapterAt}, ${novels.publishedAt}) desc, ${novels.id}
        )`.as("cover_rank"),
      })
      .from(novelGenres)
      .innerJoin(genres, eq(genres.id, novelGenres.genreId))
      .innerJoin(novels, eq(novels.id, novelGenres.novelId))
      .where(and(inArray(genres.slug, slugs), publicNovelCondition(new Date())))
      .as("ranked_genre_covers");
    const rows = await getDb()
      .select({ genreSlug: rankedCovers.genreSlug, coverKey: rankedCovers.coverKey })
      .from(rankedCovers)
      .where(lte(rankedCovers.coverRank, 3))
      .orderBy(asc(rankedCovers.genreOrder), asc(rankedCovers.coverRank))
      .limit(limit * 3);
    const coverMap = new Map<string, string[]>();
    for (const row of rows) {
      const current = coverMap.get(row.genreSlug) ?? [];
      if (current.length < 3) coverMap.set(row.genreSlug, [...current, assetUrl(row.coverKey)]);
    }
    return publicGenres.map((genre) => ({ genre, covers: coverMap.get(genre.slug) ?? [] }));
  },
  ["public-genre-showcase-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-taxonomy", "public-novels"] },
);

function chapterSummaryFromRow(row: {
  id: string;
  novelSlug: string;
  chapterNumber: number;
  sortOrder: number;
  slug: string;
  title: string;
  publishedAt: Date | null;
  isFree: boolean;
  coinPrice: number;
}): ChapterSummary {
  return {
    id: row.id,
    novelSlug: row.novelSlug,
    number: row.chapterNumber,
    slug: row.slug,
    sortOrder: row.sortOrder,
    title: row.title,
    updatedAt: formatThaiDate(row.publishedAt),
    locked: !row.isFree,
    coinPrice: row.coinPrice,
  };
}

const chapterSummarySelection = {
  id: chapters.id,
  novelSlug: novels.slug,
  chapterNumber: chapters.chapterNumber,
  sortOrder: chapters.sortOrder,
  slug: chapters.slug,
  title: chapters.title,
  publishedAt: chapters.publishedAt,
  isFree: chapters.isFree,
  coinPrice: chapters.coinPrice,
};

export const getChapterPage = cache(
  async (slugInput: string, pageInput = 1): Promise<Paginated<ChapterSummary>> => {
    const slug = cleanText(slugInput, 180);
    const requestedPage = parsePositivePage(pageInput);
    if (!slug) return { items: [], page: 1, pageSize: CHAPTER_PAGE_SIZE, total: 0, totalPages: 1 };
    const now = new Date();
    const condition = and(eq(novels.slug, slug), publicNovelCondition(now), publicChapterCondition(now));
    const db = getDb();
    const countRows = await db
      .select({ value: countDistinct(chapters.id) })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(condition);
    const total = Number(countRows[0]?.value ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / CHAPTER_PAGE_SIZE));
    const page = Math.min(requestedPage, totalPages);
    const rows = await db
      .select(chapterSummarySelection)
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(condition)
      .orderBy(asc(chapters.sortOrder), asc(chapters.id))
      .limit(CHAPTER_PAGE_SIZE)
      .offset((page - 1) * CHAPTER_PAGE_SIZE);
    return { items: rows.map(chapterSummaryFromRow), page, pageSize: CHAPTER_PAGE_SIZE, total, totalPages };
  },
);

export async function getChapters(slug: string, requestedLimit = CHAPTER_PAGE_SIZE) {
  const page = await getChapterPage(slug, 1);
  return page.items.slice(0, clampLimit(requestedLimit, CHAPTER_PAGE_SIZE, CHAPTER_PAGE_SIZE));
}

export const getLatestChapters = cache(
  async (slugInput: string, requestedLimit = 5) => {
    const slug = cleanText(slugInput, 180);
    if (!slug) return [];
    const limit = clampLimit(requestedLimit, 5, 20);
    const now = new Date();
    const rows = await getDb()
      .select(chapterSummarySelection)
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(eq(novels.slug, slug), publicNovelCondition(now), publicChapterCondition(now)))
      .orderBy(desc(chapters.sortOrder), desc(chapters.id))
      .limit(limit);
    return rows.map(chapterSummaryFromRow);
  },
);

/**
 * Access boundary: deliberately absent from the persistent Next.js data cache.
 * React request memoization only deduplicates metadata/page access within one
 * render, while every new request rechecks publication and free/paid state.
 */
const getPublishedChapterFresh = async (
  slugInput: string,
  chapterNumberInput: string | number,
): Promise<{ chapter: ChapterSummary; content: string | null; locked: boolean } | undefined> => {
    const slug = cleanText(slugInput, 180);
    const chapterNumber = Number(chapterNumberInput);
    if (!slug || !Number.isFinite(chapterNumber) || chapterNumber < 0) return undefined;
    const now = new Date();
    const rows = await getDb()
      .select({
        ...chapterSummarySelection,
        publicContent: sql<string | null>`case
          when ${chapters.isFree} then ${chapters.content}
          else nullif(left(coalesce(${chapters.excerpt}, ''), 1200), '')
        end`,
      })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(
        and(
          eq(novels.slug, slug),
          eq(chapters.chapterNumber, chapterNumber),
          publicNovelCondition(now),
          publicChapterCondition(now),
        ),
      )
      .limit(1);
    const row = rows[0];
    if (!row) return undefined;
    const locked = !row.isFree;
    return {
      chapter: chapterSummaryFromRow(row),
      content: row.publicContent,
      locked,
    };
};

export const getPublishedChapter = cache(getPublishedChapterFresh);

export const getAdjacentChapters = cache(
  async (slugInput: string, currentInput: string | number) => {
    const slug = cleanText(slugInput, 180);
    const current = Number(currentInput);
    if (!slug || !Number.isFinite(current)) return { previous: undefined, next: undefined };
    const now = new Date();
    const db = getDb();
    const currentRows = await db
      .select({ sortOrder: chapters.sortOrder, novelId: chapters.novelId })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(
        and(
          eq(novels.slug, slug),
          eq(chapters.chapterNumber, current),
          publicNovelCondition(now),
          publicChapterCondition(now),
        ),
      )
      .limit(1);
    const currentRow = currentRows[0];
    if (!currentRow) return { previous: undefined, next: undefined };
    const common = and(eq(chapters.novelId, currentRow.novelId), publicChapterCondition(now));
    const [previousRows, nextRows] = await Promise.all([
      db
        .select(chapterSummarySelection)
        .from(chapters)
        .innerJoin(novels, eq(novels.id, chapters.novelId))
        .where(and(common, sql`${chapters.sortOrder} < ${currentRow.sortOrder}`))
        .orderBy(desc(chapters.sortOrder))
        .limit(1),
      db
        .select(chapterSummarySelection)
        .from(chapters)
        .innerJoin(novels, eq(novels.id, chapters.novelId))
        .where(and(common, sql`${chapters.sortOrder} > ${currentRow.sortOrder}`))
        .orderBy(asc(chapters.sortOrder))
        .limit(1),
    ]);
    return {
      previous: previousRows[0] ? chapterSummaryFromRow(previousRows[0]) : undefined,
      next: nextRows[0] ? chapterSummaryFromRow(nextRows[0]) : undefined,
    };
  },
);

export const getSimilarNovels = cache(
  async (slugInput: string, requestedLimit = 6) => {
    const limit = clampLimit(requestedLimit, 6, 12);
    const source = await getNovelBySlug(slugInput);
    if (!source || source.genres.length === 0) return [];
    const rows = await getNovelsUncached({ genre: source.genres.join(","), sort: "rating" }, limit + 1);
    return rows.filter((novel) => novel.slug !== source.slug).slice(0, limit);
  },
);

async function getUpdatesUncached(
  rangeInput: "today" | "yesterday" | "week" | "all" = "all",
  genreInput?: string,
  requestedLimit = 50,
  novelSlugInputs?: string[],
) {
    const range = ["today", "yesterday", "week", "all"].includes(rangeInput) ? rangeInput : "all";
    const genre = cleanText(genreInput, 120);
    const limit = clampLimit(requestedLimit, 50);
    const now = new Date();
    const conditions: SQL[] = [publicNovelCondition(now)!, publicChapterCondition(now)!];
    const novelSlugs = [...new Set((novelSlugInputs ?? []).map((slug) => cleanText(slug, 180)).filter((slug): slug is string => Boolean(slug)))].slice(0, 100);
    if (novelSlugs.length > 0) conditions.push(inArray(novels.slug, novelSlugs));
    const startOfToday = startOfBangkokDay(now);
    if (range === "today") conditions.push(gte(chapters.publishedAt, startOfToday));
    if (range === "yesterday") {
      const start = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1_000);
      conditions.push(gte(chapters.publishedAt, start), sql`${chapters.publishedAt} < ${startOfToday}`);
    }
    if (range === "week") conditions.push(gte(chapters.publishedAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1_000)));
    if (genre) {
      conditions.push(
        exists(
          getDb()
            .select({ id: novelGenres.novelId })
            .from(novelGenres)
            .innerJoin(genres, eq(genres.id, novelGenres.genreId))
            .where(and(eq(novelGenres.novelId, novels.id), eq(genres.isActive, true), eq(genres.slug, genre))),
        ),
      );
    }

    const rows = await getDb()
      .select({
        novelId: novels.id,
        chapter: chapters.chapterNumber,
        chapterTitle: chapters.title,
        publishedAt: chapters.publishedAt,
      })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(...conditions))
      .orderBy(desc(chapters.publishedAt), desc(chapters.id))
      .limit(limit);
    const ids = [...new Set(rows.map((row) => row.novelId))];
    const novelRows = ids.length
      ? await selectBaseNovels(and(publicNovelCondition(now), inArray(novels.id, ids))!, orderBy("updated"), ids.length)
      : [];
    const hydrated = await hydrateNovels(novelRows);
    const byId = new Map(hydrated.map((novel) => [novel.id, novel]));

    return rows.flatMap((row): NovelUpdate[] => {
      const novel = byId.get(row.novelId);
      if (!novel || !row.publishedAt) return [];
      return [{
        novelSlug: novel.slug,
        chapter: row.chapter,
        chapterTitle: row.chapterTitle,
        time: formatRelativeTime(row.publishedAt, now),
        novel,
        publishedAt: row.publishedAt.toISOString(),
      }];
    });
}

const getGenericUpdatesCached = unstable_cache(
  (range: "today" | "yesterday" | "week" | "all", limit: number) =>
    getUpdatesUncached(range, undefined, limit),
  ["public-updates-v3"],
  { revalidate: 60, tags: ["public-chapters", "public-novels"] },
);

export async function getUpdates(
  rangeInput: "today" | "yesterday" | "week" | "all" = "all",
  genreInput?: string,
  requestedLimit = 50,
  novelSlugInputs?: string[],
) {
  const range = ["today", "yesterday", "week", "all"].includes(rangeInput) ? rangeInput : "all";
  const genre = cleanText(genreInput, 120);
  const limit = clampLimit(requestedLimit, 50);
  const allowed = [...new Set(novelSlugInputs ?? [])].slice(0, 100);
  // Genre, slug-set and other user-cardinality inputs stay out of the global
  // cache. Only the finite generic range/limit combinations are persisted.
  return genre || allowed.length > 0
    ? getUpdatesUncached(range, genre, limit, allowed)
    : getGenericUpdatesCached(range, limit);
}

export async function getNovelUpdates(slug: string, requestedLimit = 20) {
  const limit = clampLimit(requestedLimit, 20);
  return getUpdates("all", undefined, limit, [slug]);
}

export async function getUpdatesForNovels(slugs: string[], requestedLimit = 12) {
  const allowed = [...new Set(slugs)].slice(0, 100);
  if (allowed.length === 0) return [];
  // A follow set is user-cardinality input. Keep it out of the global
  // incremental cache; the bounded SQL query still returns only public data.
  return getUpdatesUncached("all", undefined, clampLimit(requestedLimit, 12), allowed);
}

export const getPublishedReviews = cache(
  async (slugInput: string, requestedLimit = 10): Promise<Review[]> => {
    const slug = cleanText(slugInput, 180);
    if (!slug) return [];
    const limit = clampLimit(requestedLimit, 10, 20);
    const now = new Date();
    const rows = await getDb()
      .select({
        id: reviews.id,
        authorName: users.name,
        authorImage: users.image,
        authorAvatarKey: users.avatarKey,
        score: ratings.score,
        title: reviews.title,
        content: reviews.body,
        isSpoiler: reviews.isSpoiler,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .innerJoin(users, eq(users.id, reviews.userId))
      .innerJoin(novels, eq(novels.id, reviews.novelId))
      .leftJoin(ratings, and(eq(ratings.userId, reviews.userId), eq(ratings.novelId, reviews.novelId)))
      .where(
        and(
          eq(novels.slug, slug),
          publicNovelCondition(now),
          eq(reviews.status, "PUBLISHED"),
          isNull(reviews.deletedAt),
          eq(users.status, "ACTIVE"),
        ),
      )
      .orderBy(desc(reviews.createdAt), desc(reviews.id))
      .limit(limit);
    return rows.map((row) => ({
      id: row.id,
      authorName: row.authorName || "นักอ่าน NiyaiNow",
      authorImage: row.authorImage || (row.authorAvatarKey ? assetUrl(row.authorAvatarKey) : null),
      rating: row.score,
      title: row.title,
      content: row.content,
      isSpoiler: row.isSpoiler,
      createdAt: row.createdAt.toISOString(),
    }));
  },
);

/**
 * Atomically records a validated public page view. No viewer identifier enters
 * PostgreSQL; callers pass only whether the process-local deduper considers the
 * reader unique for this novel/day.
 */
export async function recordPublicView(input: {
  slug: string;
  chapterNumber?: number;
  uniqueNovelReader: boolean;
  now?: Date;
}) {
  const slug = cleanText(input.slug, 180);
  if (!slug) return false;
  const now = input.now ?? new Date();
  const chapterNumber = input.chapterNumber;
  if (chapterNumber !== undefined && (!Number.isFinite(chapterNumber) || chapterNumber < 0)) return false;

  return getDb().transaction(async (tx) => {
    const novelRows = await tx
      .select({ id: novels.id })
      .from(novels)
      .where(and(eq(novels.slug, slug), publicNovelCondition(now)))
      .limit(1);
    const novel = novelRows[0];
    if (!novel) return false;

    if (chapterNumber !== undefined) {
      const chapterRows = await tx
        .select({ id: chapters.id })
        .from(chapters)
        .where(
          and(
            eq(chapters.novelId, novel.id),
            eq(chapters.chapterNumber, chapterNumber),
            publicChapterCondition(now),
          ),
        )
        .limit(1);
      if (!chapterRows[0]) return false;
    }

    await tx
      .insert(novelStatistics)
      .values({ novelId: novel.id, viewCount: 1 })
      .onConflictDoUpdate({
        target: novelStatistics.novelId,
        set: {
          viewCount: sql`${novelStatistics.viewCount} + 1`,
          updatedAt: now,
        },
      });

    const uniqueIncrement = input.uniqueNovelReader ? 1 : 0;
    const chapterIncrement = chapterNumber === undefined ? 0 : 1;
    await tx
      .insert(novelDailyStats)
      .values({
        novelId: novel.id,
        statDate: bangkokDateKey(now),
        views: 1,
        uniqueReaders: uniqueIncrement,
        chapterReads: chapterIncrement,
      })
      .onConflictDoUpdate({
        target: [novelDailyStats.novelId, novelDailyStats.statDate],
        set: {
          views: sql`${novelDailyStats.views} + 1`,
          uniqueReaders: sql`${novelDailyStats.uniqueReaders} + ${uniqueIncrement}`,
          chapterReads: sql`${novelDailyStats.chapterReads} + ${chapterIncrement}`,
          updatedAt: now,
        },
      });

    return true;
  });
}

// Keep generated XML comfortably below common serverless response limits even
// when URLs, image locations, and timestamps are near their maximum lengths.
export const SITEMAP_PARTITION_SIZE = 10_000;

async function getSitemapCountsUncached() {
  const now = new Date();
  const [novelRows, chapterRows] = await Promise.all([
    getDb()
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(novels)
      .where(publicNovelCondition(now)),
    getDb()
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(publicNovelCondition(now), publicChapterCondition(now))),
  ]);
  const novelCount = novelRows[0]?.value ?? 0;
  const chapterCount = chapterRows[0]?.value ?? 0;
  const total = novelCount + chapterCount;
  return {
    novelCount,
    chapterCount,
    total,
    partitions: Math.max(1, Math.ceil(total / SITEMAP_PARTITION_SIZE)),
  };
}

export const getSitemapCounts = unstable_cache(getSitemapCountsUncached, ["public-sitemap-counts-v3"], {
  revalidate: 3_600,
  tags: ["public-sitemap", "public-novels", "public-chapters"],
});

export const getSitemapPartition = unstable_cache(
  async (partitionInput: number) => {
    const partition = Number.isSafeInteger(partitionInput) && partitionInput >= 0 ? partitionInput : 0;
    const counts = await getSitemapCountsUncached();
    const offset = partition * SITEMAP_PARTITION_SIZE;
    if (offset >= counts.total) return { novels: [], chapters: [] };

    const now = new Date();
    const novelOffset = Math.min(offset, counts.novelCount);
    const novelTake = Math.min(SITEMAP_PARTITION_SIZE, Math.max(0, counts.novelCount - novelOffset));
    const novelRows = novelTake > 0
      ? await getDb()
          .select({ slug: novels.slug, updatedAt: novels.updatedAt, coverKey: novels.coverKey })
          .from(novels)
          .where(publicNovelCondition(now))
          .orderBy(asc(novels.id))
          .limit(novelTake)
          .offset(novelOffset)
      : [];
    const remaining = SITEMAP_PARTITION_SIZE - novelRows.length;
    const chapterOffset = Math.max(0, offset - counts.novelCount);
    const chapterRows = remaining > 0
      ? await getDb()
          .select({ novelSlug: novels.slug, chapterNumber: chapters.chapterNumber, updatedAt: chapters.updatedAt })
          .from(chapters)
          .innerJoin(novels, eq(novels.id, chapters.novelId))
          .where(and(publicNovelCondition(now), publicChapterCondition(now)))
          .orderBy(asc(novels.id), asc(chapters.sortOrder), asc(chapters.id))
          .limit(remaining)
          .offset(chapterOffset)
      : [];

    return {
      novels: novelRows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updatedAt.toISOString(),
        cover: row.coverKey ? assetUrl(row.coverKey) : undefined,
      })),
      chapters: chapterRows.map((row) => ({
        novelSlug: row.novelSlug,
        chapterNumber: row.chapterNumber,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  },
  ["public-sitemap-partition-v3"],
  { revalidate: 3_600, tags: ["public-sitemap", "public-novels", "public-chapters"] },
);
