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
  novelAlternativeTitles,
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
import { PUBLIC_CACHE_TTL } from "@/lib/cache/public-cache-profiles";
import { toPublicChapterCachePayload } from "@/lib/domain/chapter-cache";
import { bangkokDateKey } from "@/lib/domain/public-view";
import { SEARCH_RELEVANCE_WEIGHTS } from "@/lib/search/relevance";
import { applicationCache } from "@/lib/redis/cache";
import { cacheDigest, cacheKeys } from "@/lib/redis/keys";
import { CACHE_TTL_SECONDS } from "@/lib/redis/ttl";
import type { CacheCategory } from "@/lib/redis/metrics";
import { assetUrl, publicAssetFallbacks } from "@/lib/site-config";
import type {
  ChapterCatalogOrder,
  ChapterCatalogPage,
  ChapterSummary,
  ChapterWindow,
  Genre,
  Novel,
  Paginated,
  Review,
  UpdateItem,
} from "@/types/novel";
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

const PUBLIC_CACHE_SECONDS = 15 * 60;
const STABLE_PUBLIC_CACHE_SECONDS = 6 * 60 * 60;
const SEARCH_LIMIT = 18;
const SUGGESTION_LIMIT = 8;
const MAX_LIST_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;
const latestChapters = alias(chapters, "latest_chapters");

async function getOrSetVersioned<T>(input: {
  versionKeys: string[];
  key: (versions: number[]) => string;
  ttlSeconds: number;
  category: CacheCategory;
  loader: () => Promise<T>;
}) {
  const versions = await Promise.all(input.versionKeys.map((versionKey) => applicationCache.version(versionKey)));
  if (versions.some((version) => version === undefined)) return input.loader();
  return applicationCache.getOrSet({
    key: input.key(versions as number[]),
    ttlSeconds: input.ttlSeconds,
    category: input.category,
    loader: input.loader,
  });
}

export type GenreFacet = Genre & { matches: number };

export type TagSummary = {
  slug: string;
  name: string;
  description: string;
  count: number;
};

export type AuthorSearchResult = {
  slug: string;
  name: string;
  nativeName: string | null;
  novelCount: number;
};

export type PublicSearchResult = {
  novels: Novel[];
  authors: AuthorSearchResult[];
  translators: AuthorSearchResult[];
  genres: Genre[];
  tags: TagSummary[];
  page: number;
  total: number;
  totalPages: number;
};

export type SearchSuggestion = {
  kind: "novel" | "author" | "translator" | "genre" | "tag";
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
  reviewCount: number;
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

function safeSearchPrefix(value: string) {
  return `${value.replace(/[%_\\]/gu, " ")}%`;
}

const PUBLIC_AUTHOR_ROLES = ["AUTHOR", "ORIGINAL_AUTHOR"] as const;

/**
 * Field-aware relevance used by both filtering and default result ordering.
 * Correlated subqueries keep one row per novel while still distinguishing the
 * semantic source of a match. `greatest` makes the strongest source win.
 */
function searchRelevanceScore(term: string) {
  const weights = SEARCH_RELEVANCE_WEIGHTS;
  const pattern = safeSearchPattern(term);
  const prefix = safeSearchPrefix(term);
  const publicAuthorRole = inArray(novelAuthors.role, PUBLIC_AUTHOR_ROLES);
  const translatorRole = eq(novelAuthors.role, "TRANSLATOR");

  const titleScore = sql<number>`case
    when lower(${novels.title}) = lower(${term}) then ${weights.titleExact}
    when ${novels.title} ilike ${prefix} then ${weights.titlePrefix}
    when ${novels.title} ilike ${pattern} then ${weights.titleContains}
    else 0
  end`;
  const originalTitleScore = sql<number>`case
    when lower(coalesce(${novels.titleOriginal}, '')) = lower(${term}) then ${weights.originalTitleExact}
    when coalesce(${novels.titleOriginal}, '') ilike ${prefix} then ${weights.originalTitlePrefix}
    when coalesce(${novels.titleOriginal}, '') ilike ${pattern} then ${weights.originalTitleContains}
    else 0
  end`;
  const alternativeTitleScore = sql<number>`coalesce((
    select max(case
      when lower(${novelAlternativeTitles.title}) = lower(${term}) then ${weights.alternativeTitleExact}
      when ${novelAlternativeTitles.title} ilike ${prefix} then ${weights.alternativeTitlePrefix}
      when ${novelAlternativeTitles.title} ilike ${pattern} then ${weights.alternativeTitleContains}
      else 0
    end)
    from ${novelAlternativeTitles}
    where ${novelAlternativeTitles.novelId} = ${novels.id}
  ), 0)`;
  const authorScore = sql<number>`coalesce((
    select max(case
      when lower(${authors.name}) = lower(${term})
        or lower(coalesce(${authors.nativeName}, '')) = lower(${term})
        or lower(${authors.slug}) = lower(${term}) then ${weights.authorExact}
      when ${authors.name} ilike ${prefix}
        or coalesce(${authors.nativeName}, '') ilike ${prefix}
        or ${authors.slug} ilike ${prefix} then ${weights.authorPrefix}
      when ${authors.name} ilike ${pattern}
        or coalesce(${authors.nativeName}, '') ilike ${pattern}
        or ${authors.slug} ilike ${pattern} then ${weights.authorContains}
      else 0
    end)
    from ${novelAuthors}
    inner join ${authors} on ${authors.id} = ${novelAuthors.authorId}
    where ${novelAuthors.novelId} = ${novels.id} and ${publicAuthorRole}
  ), 0)`;
  const translatorScore = sql<number>`coalesce((
    select max(case
      when lower(${authors.name}) = lower(${term})
        or lower(coalesce(${authors.nativeName}, '')) = lower(${term})
        or lower(${authors.slug}) = lower(${term}) then ${weights.translatorExact}
      when ${authors.name} ilike ${prefix}
        or coalesce(${authors.nativeName}, '') ilike ${prefix}
        or ${authors.slug} ilike ${prefix} then ${weights.translatorPrefix}
      when ${authors.name} ilike ${pattern}
        or coalesce(${authors.nativeName}, '') ilike ${pattern}
        or ${authors.slug} ilike ${pattern} then ${weights.translatorContains}
      else 0
    end)
    from ${novelAuthors}
    inner join ${authors} on ${authors.id} = ${novelAuthors.authorId}
    where ${novelAuthors.novelId} = ${novels.id} and ${translatorRole}
  ), 0)`;
  const genreScore = sql<number>`coalesce((
    select max(case
      when lower(${genres.name}) = lower(${term})
        or lower(coalesce(${genres.thaiName}, '')) = lower(${term})
        or lower(${genres.slug}) = lower(${term}) then ${weights.genreExact}
      when ${genres.name} ilike ${prefix}
        or coalesce(${genres.thaiName}, '') ilike ${prefix}
        or ${genres.slug} ilike ${prefix} then ${weights.genrePrefix}
      when ${genres.name} ilike ${pattern}
        or coalesce(${genres.thaiName}, '') ilike ${pattern}
        or ${genres.slug} ilike ${pattern} then ${weights.genreContains}
      else 0
    end)
    from ${novelGenres}
    inner join ${genres} on ${genres.id} = ${novelGenres.genreId}
    where ${novelGenres.novelId} = ${novels.id} and ${genres.isActive} = true
  ), 0)`;
  const tagScore = sql<number>`coalesce((
    select max(case
      when lower(${tags.name}) = lower(${term})
        or lower(${tags.slug}) = lower(${term}) then ${weights.tagExact}
      when ${tags.name} ilike ${prefix}
        or ${tags.slug} ilike ${prefix} then ${weights.tagPrefix}
      when ${tags.name} ilike ${pattern}
        or ${tags.slug} ilike ${pattern} then ${weights.tagContains}
      else 0
    end)
    from ${novelTags}
    inner join ${tags} on ${tags.id} = ${novelTags.tagId}
    where ${novelTags.novelId} = ${novels.id} and ${tags.isActive} = true
  ), 0)`;
  const keywordScore = sql<number>`case when exists(
    select 1
    from ${novelSearchDocuments}
    where ${novelSearchDocuments.novelId} = ${novels.id}
      and ${novelSearchDocuments.searchText} ilike ${pattern}
  ) then ${weights.keywordContains} else 0 end`;

  return sql<number>`greatest(
    ${titleScore},
    ${originalTitleScore},
    ${alternativeTitleScore},
    ${authorScore},
    ${translatorScore},
    ${genreScore},
    ${tagScore},
    ${keywordScore}
  )`;
}

function searchCondition(term: string) {
  return sql`${searchRelevanceScore(term)} > 0`;
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

function orderByForQuery(query: NormalizedNovelQuery): SQL[] {
  if (!query.q || query.sort !== "popular") return orderBy(query.sort);
  return [
    desc(searchRelevanceScore(query.q)),
    ...orderBy("popular"),
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
  reviewCount: sql<number>`coalesce(${novelStatistics.reviewCount}, 0)`.mapWith(Number),
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

async function hydrateNovels(rows: BaseNovelRow[], mode: "list" | "detail" = "list"): Promise<Novel[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const db = getDb();
  const now = new Date();
  const includeDetails = mode === "detail";

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
    includeDetails
      ? db
          .select({ novelId: novelTags.novelId, slug: tags.slug, name: tags.name })
          .from(novelTags)
          .innerJoin(tags, eq(tags.id, novelTags.tagId))
          .where(and(inArray(novelTags.novelId, ids), eq(tags.isActive, true)))
          .orderBy(asc(tags.name))
      : Promise.resolve([]),
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
    includeDetails
      ? db
          .selectDistinct({ novelId: chapters.novelId })
          .from(chapters)
          .where(
            and(
              inArray(chapters.novelId, ids),
              publicChapterCondition(now),
              eq(chapters.isFree, false),
            ),
          )
      : Promise.resolve([]),
  ]);

  const genreMap = new Map<string, typeof genreRows>();
  const tagMap = new Map<string, typeof tagRows>();
  const authorMap = new Map<string, typeof authorRows>();
  const paid = new Set(paidRows.map((row) => row.novelId));

  for (const row of genreRows) genreMap.set(row.novelId, [...(genreMap.get(row.novelId) ?? []), row]);
  for (const row of tagRows) tagMap.set(row.novelId, [...(tagMap.get(row.novelId) ?? []), row]);
  for (const row of authorRows) authorMap.set(row.novelId, [...(authorMap.get(row.novelId) ?? []), row]);

  return rows.map((row) => {
    const novelGenresForRow = genreMap.get(row.id) ?? [];
    const people = authorMap.get(row.id) ?? [];
    const primaryAuthor = people.find((person) => person.role === "AUTHOR" || person.role === "ORIGINAL_AUTHOR");
    const translator = people.find((person) => person.role === "TRANSLATOR");
    const cover = assetUrl(row.coverKey, publicAssetFallbacks.novelCover);
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
      tags: (tagMap.get(row.id) ?? []).map((tag) => tag.slug),
      // ป้ายกำกับที่ผู้อ่านเห็น — slug ถูกสร้างอัตโนมัติจึงอ่านไม่รู้เรื่อง (tag-1t0u0zf)
      tagNames: Object.fromEntries((tagMap.get(row.id) ?? []).map((tag) => [tag.slug, tag.name])),
      status: toPublicStatus(row.status),
      rating: Number(row.rating.toFixed(2)),
      ratingCount: row.ratingCount,
      reviewCount: row.reviewCount,
      views: row.views,
      chapters: row.chapters,
      synopsis: row.synopsis,
      cover,
      backdrop: assetUrl(row.bannerKey, publicAssetFallbacks.novelBackdrop),
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
  const [countRows, requestedRows] = await Promise.all([
    db
      .select({ value: countDistinct(novels.id) })
      .from(novels)
      .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
      .where(where),
    selectBaseNovels(
      where,
      orderByForQuery(query),
      BROWSE_PAGE_SIZE,
      (query.page - 1) * BROWSE_PAGE_SIZE,
    ),
  ]);
  const total = Number(countRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / BROWSE_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const rows = page === query.page
    ? requestedRows
    : await selectBaseNovels(where, orderByForQuery(query), BROWSE_PAGE_SIZE, (page - 1) * BROWSE_PAGE_SIZE);

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

async function getNovelPageFromRedis(query: NormalizedNovelQuery) {
  return getOrSetVersioned({
    versionKeys: [cacheKeys.versions.catalog()],
    key: ([version]) => cacheKeys.catalogPage(cacheDigest(query), version),
    ttlSeconds: query.genre ? CACHE_TTL_SECONDS.GENRE_PAGE : CACHE_TTL_SECONDS.HOMEPAGE_CATALOG,
    category: query.genre ? "genre" : "homepage",
    loader: () => getNovelPageNormalized(query),
  });
}

const getNovelPageCached = unstable_cache(getNovelPageFromRedis, ["public-novel-page-v4"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: ["public-novels"],
});

export async function getNovelPage(queryInput: NovelQuery = {}) {
  const query = normalizeNovelQuery(queryInput);
  // Free-text, tag and multi-genre combinations are attacker-cardinality input
  // and must not create persistent shared-cache entries. A single canonical
  // genre page is bounded by the editorial genre set and is safe to cache.
  if (query.q || query.tag || parseGenreParam(query.genre).length > 1) return getNovelPageNormalized(query);
  return query.genre ? getNovelPageFromRedis(query) : getNovelPageCached(query);
}

async function getNovelsUncached(queryInput: NovelQuery = {}, requestedLimit = MAX_LIST_LIMIT) {
  const query = normalizeNovelQuery(queryInput);
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT);
  const rows = await selectBaseNovels(queryCondition(query, new Date()), orderBy(query.sort), limit);
  return hydrateNovels(rows);
}

export const getNovels = cache(getNovelsUncached);

async function getNovelBySlugFromRedis(slug: string) {
  return getOrSetVersioned({
    versionKeys: [cacheKeys.versions.novel(slug), cacheKeys.versions.taxonomy()],
    key: ([version, taxonomyVersion]) => cacheKeys.novel(slug, version, taxonomyVersion),
    ttlSeconds: CACHE_TTL_SECONDS.NOVEL_DETAIL,
    category: "novel",
    loader: async () => {
      const rows = await selectBaseNovels(
        and(publicNovelCondition(new Date()), eq(novels.slug, slug))!,
        [desc(sql`${novels.id}`)],
        1,
      );
      return (await hydrateNovels(rows, "detail"))[0];
    },
  });
}

const getNovelBySlugCached = unstable_cache(getNovelBySlugFromRedis, ["public-novel-by-slug-v4"], {
  revalidate: PUBLIC_CACHE_SECONDS,
  tags: ["public-novels"],
});

export const getNovelBySlug = cache(async (slugInput: string) => {
  const slug = cleanText(slugInput, 180);
  return slug ? getNovelBySlugCached(slug) : undefined;
});

export const getFeaturedNovels = unstable_cache(
  async (requestedLimit = 6) => {
    const limit = clampLimit(requestedLimit, 6, 12);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.homepage()],
      key: ([version]) => cacheKeys.home("featured", limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_LATEST,
      category: "homepage",
      loader: async () => {
        const rows = await selectBaseNovels(
          and(publicNovelCondition(new Date()), eq(novels.isFeatured, true))!,
          orderBy("updated"),
          limit,
        );
        return hydrateNovels(rows);
      },
    });
  },
  ["public-featured-novels-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

export const getRecommendedNovels = unstable_cache(
  async (requestedLimit = 12) => {
    const limit = clampLimit(requestedLimit, 12, 24);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.homepage()],
      key: ([version]) => cacheKeys.home("recommended", limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_POPULAR,
      category: "homepage",
      loader: async () => {
        const rows = await selectBaseNovels(publicNovelCondition(new Date())!, orderBy("rating"), limit);
        return hydrateNovels(rows);
      },
    });
  },
  ["public-recommended-novels-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

export const getNewThisWeek = unstable_cache(
  async (requestedLimit = 12) => {
    const limit = clampLimit(requestedLimit, 12, 24);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.homepage()],
      key: ([version]) => cacheKeys.home("new-this-week", limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_LATEST,
      category: "homepage",
      loader: async () => {
        const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1_000);
        const rows = await selectBaseNovels(
          and(publicNovelCondition(new Date()), gte(novels.publishedAt, threshold))!,
          orderBy("new"),
          limit,
        );
        return hydrateNovels(rows);
      },
    });
  },
  ["public-new-this-week-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-novels"] },
);

export const getCompletedNovels = unstable_cache(
  async (requestedLimit = 12) => {
    const limit = clampLimit(requestedLimit, 12, 24);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.homepage()],
      key: ([version]) => cacheKeys.home("completed", limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_CATALOG,
      category: "homepage",
      loader: async () => {
        const rows = await selectBaseNovels(
          and(publicNovelCondition(new Date()), eq(novels.status, "COMPLETED"))!,
          orderBy("rating"),
          limit,
        );
        return hydrateNovels(rows);
      },
    });
  },
  ["public-completed-novels-v3"],
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
    const normalizedLimit = Math.min(Math.max(limit, 1), MAX_LIST_LIMIT);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.banner()],
      key: ([version]) => cacheKeys.banner(normalizedLimit, version),
      ttlSeconds: CACHE_TTL_SECONDS.BANNER,
      category: "banner",
      loader: async () => {
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
          .limit(normalizedLimit);
        return rows.map((row) => ({
          id: row.id,
          title: row.title,
          subtitle: row.subtitle,
          image: assetUrl(row.imageKey, publicAssetFallbacks.novelBackdrop),
          linkUrl: row.linkUrl,
          ctaLabel: row.ctaLabel,
        }));
      },
    });
  },
  ["public-banners-v2"],
  { revalidate: 60, tags: ["public-banners"] },
);

export const getGenres = unstable_cache(async (requestedLimit = MAX_LIST_LIMIT) => {
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT, 200);
  return getOrSetVersioned({
    versionKeys: [cacheKeys.versions.taxonomy(), cacheKeys.versions.catalog()],
    key: ([taxonomyVersion, catalogVersion]) =>
      cacheKeys.taxonomy("genres", `${limit}-c${catalogVersion}`, taxonomyVersion),
    ttlSeconds: CACHE_TTL_SECONDS.TAXONOMY,
    category: "taxonomy",
    loader: () => getGenresUncached(limit),
  });
}, ["public-genres-v3"], {
  revalidate: STABLE_PUBLIC_CACHE_SECONDS,
  tags: ["public-taxonomy", "public-novels"],
});

const getGenreBySlugCached = unstable_cache(
  async (slug: string) => getOrSetVersioned({
    versionKeys: [cacheKeys.versions.taxonomy(), cacheKeys.versions.catalog()],
    key: ([taxonomyVersion, catalogVersion]) =>
      cacheKeys.taxonomy("genre", `${slug}-c${catalogVersion}`, taxonomyVersion),
    ttlSeconds: CACHE_TTL_SECONDS.TAXONOMY,
    category: "genre",
    loader: async () => {
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
        .where(and(eq(genres.isActive, true), eq(genres.slug, slug)))
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
  }),
  ["public-genre-by-slug-v4"],
  { revalidate: STABLE_PUBLIC_CACHE_SECONDS, tags: ["public-taxonomy", "public-novels"] },
);

export const getGenreBySlug = cache(async (slugInput: string) => {
  const slug = cleanText(slugInput, 120);
  return slug ? getGenreBySlugCached(slug) : undefined;
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
  if (query.q || query.tag || parseGenreParam(query.genre).length > 1) return getGenreFacetsNormalized(query);
  if (!query.genre) return getGenreFacetsCached(query);
  return getOrSetVersioned({
    versionKeys: [cacheKeys.versions.taxonomy(), cacheKeys.versions.catalog()],
    key: ([taxonomyVersion, catalogVersion]) =>
      cacheKeys.taxonomy("facets", `${cacheDigest(query)}-c${catalogVersion}`, taxonomyVersion),
    ttlSeconds: CACHE_TTL_SECONDS.GENRE_PAGE,
    category: "genre",
    loader: () => getGenreFacetsNormalized(query),
  });
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
    revalidate: STABLE_PUBLIC_CACHE_SECONDS,
    tags: ["public-taxonomy", "public-novels"],
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
  { revalidate: STABLE_PUBLIC_CACHE_SECONDS, tags: ["public-taxonomy", "public-novels"] },
);

export const getTagBySlug = cache(async (slugInput: string) => {
  const id = await resolveActiveTagId(slugInput);
  return id ? getTagByIdCached(id) : undefined;
});

export async function searchNovels(
  searchInput: string,
  pageInput = 1,
  filtersInput: NovelQuery = {},
): Promise<PublicSearchResult> {
    const q = cleanText(searchInput);
    const page = parsePositivePage(pageInput);
    if (!q || q.length < 2) {
      return { novels: [], authors: [], translators: [], genres: [], tags: [], page: 1, total: 0, totalPages: 1 };
    }
    const pattern = safeSearchPattern(q);
    const prefix = safeSearchPrefix(q);
    const now = new Date();
    const personMatch = or(ilike(authors.name, pattern), ilike(authors.nativeName, pattern), ilike(authors.slug, pattern));
    const personRelevance = desc(sql<number>`case
      when lower(${authors.name}) = lower(${q})
        or lower(coalesce(${authors.nativeName}, '')) = lower(${q})
        or lower(${authors.slug}) = lower(${q}) then 3
      when ${authors.name} ilike ${prefix}
        or coalesce(${authors.nativeName}, '') ilike ${prefix}
        or ${authors.slug} ilike ${prefix} then 2
      else 1
    end`);
    const [novelPage, authorRows, translatorRows, genreRows, tagRows] = await Promise.all([
      getNovelPageUncached({ ...filtersInput, q, page }),
      getDb()
        .select({
          slug: authors.slug,
          name: authors.name,
          nativeName: authors.nativeName,
          novelCount: countDistinct(novelAuthors.novelId),
        })
        .from(authors)
        .innerJoin(novelAuthors, eq(novelAuthors.authorId, authors.id))
        .innerJoin(novels, and(eq(novels.id, novelAuthors.novelId), publicNovelCondition(now)))
        .where(and(inArray(novelAuthors.role, PUBLIC_AUTHOR_ROLES), personMatch))
        .groupBy(authors.id)
        .orderBy(personRelevance, desc(countDistinct(novelAuthors.novelId)), asc(authors.name))
        .limit(SUGGESTION_LIMIT),
      getDb()
        .select({
          slug: authors.slug,
          name: authors.name,
          nativeName: authors.nativeName,
          novelCount: countDistinct(novelAuthors.novelId),
        })
        .from(authors)
        .innerJoin(novelAuthors, eq(novelAuthors.authorId, authors.id))
        .innerJoin(novels, and(eq(novels.id, novelAuthors.novelId), publicNovelCondition(now)))
        .where(and(eq(novelAuthors.role, "TRANSLATOR"), personMatch))
        .groupBy(authors.id)
        .orderBy(personRelevance, desc(countDistinct(novelAuthors.novelId)), asc(authors.name))
        .limit(SUGGESTION_LIMIT),
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
      authors: authorRows.map((row) => ({
        slug: row.slug,
        name: row.name,
        nativeName: row.nativeName,
        novelCount: Number(row.novelCount),
      })),
      translators: translatorRows.map((row) => ({
        slug: row.slug,
        name: row.name,
        nativeName: row.nativeName,
        novelCount: Number(row.novelCount),
      })),
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
  const novelSuggestions = results.novels.map((novel) => ({
    kind: "novel" as const,
    label: novel.thaiTitle,
    meta: novel.title,
    href: `/novel/${novel.slug}`,
  }));
  const authorSuggestions = results.authors.map((author) => ({
    kind: "author" as const,
    label: author.name,
    meta: `${author.novelCount.toLocaleString("th-TH")} เรื่อง`,
    href: `/search?q=${encodeURIComponent(author.name)}`,
  }));
  const translatorSuggestions = results.translators.map((translator) => ({
    kind: "translator" as const,
    label: translator.name,
    meta: `${translator.novelCount.toLocaleString("th-TH")} เรื่อง`,
    href: `/search?q=${encodeURIComponent(translator.name)}`,
  }));
  const genreSuggestions = results.genres.map((genre) => ({
    kind: "genre" as const,
    label: genre.thaiName,
    meta: "หมวดหมู่",
    href: `/genre/${genre.slug}`,
  }));
  const tagSuggestions = results.tags.map((tag) => ({
    kind: "tag" as const,
    label: tag.name,
    meta: "แท็ก",
    href: `/tag/${tag.slug}`,
  }));

  // Reserve space for every matched entity type, then backfill unused slots
  // so searches without taxonomy/author matches still return a full novel list.
  return [
    ...novelSuggestions.slice(0, 4),
    ...authorSuggestions.slice(0, 1),
    ...translatorSuggestions.slice(0, 1),
    ...genreSuggestions.slice(0, 1),
    ...tagSuggestions.slice(0, 1),
    ...novelSuggestions.slice(4),
    ...authorSuggestions.slice(1),
    ...translatorSuggestions.slice(1),
    ...genreSuggestions.slice(1),
    ...tagSuggestions.slice(1),
  ].slice(0, SUGGESTION_LIMIT);
}

async function getRankingsUncached(periodInput: RankingPeriod = "WEEKLY", requestedLimit = MAX_LIST_LIMIT) {
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
}

export const getRankings = unstable_cache(
  async (periodInput: RankingPeriod = "WEEKLY", requestedLimit = MAX_LIST_LIMIT) => {
    const period: RankingPeriod = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"].includes(periodInput)
      ? periodInput
      : "WEEKLY";
    const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.ranking(), cacheKeys.versions.catalog()],
      key: ([rankingVersion, catalogVersion]) =>
        cacheKeys.ranking(`${period}-c${catalogVersion}`, limit, rankingVersion),
      ttlSeconds: CACHE_TTL_SECONDS.RANKING,
      category: "ranking",
      loader: () => getRankingsUncached(period, limit),
    });
  },
  ["public-rankings-v3"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-rankings", "public-novels"] },
);

export type RankingMovement = {
  direction: "up" | "down" | "same" | "new";
  places?: number;
};

export type RankingEntry = {
  novel: Novel;
  rank: number;
  movement?: RankingMovement;
};

/**
 * Adds honest movement only when two real precomputed snapshots exist.
 * Aggregate fallbacks still return useful ranks, but never invent movement.
 */
export const getRankingEntries = cache(async (
  periodInput: RankingPeriod = "WEEKLY",
  requestedLimit = MAX_LIST_LIMIT,
): Promise<RankingEntry[]> => {
  const period: RankingPeriod = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"].includes(periodInput)
    ? periodInput
    : "WEEKLY";
  const limit = clampLimit(requestedLimit, MAX_LIST_LIMIT);
  const db = getDb();
  const [rankedNovels, periods] = await Promise.all([
    getRankings(period, limit),
    db
      .select({ periodStart: novelRankings.periodStart })
      .from(novelRankings)
      .where(eq(novelRankings.period, period))
      .groupBy(novelRankings.periodStart)
      .orderBy(desc(novelRankings.periodStart))
      .limit(2),
  ]);
  if (!rankedNovels.length) return [];
  const latest = periods[0]?.periodStart;
  const previous = periods[1]?.periodStart;
  if (!latest) {
    return rankedNovels.map((novel, index) => ({ novel, rank: index + 1 }));
  }
  const rankedSlugs = rankedNovels.map((novel) => novel.slug);

  const [currentRows, previousRows] = await Promise.all([
    db
      .select({ slug: novels.slug, rank: novelRankings.rank })
      .from(novelRankings)
      .innerJoin(novels, eq(novels.id, novelRankings.novelId))
      .where(and(eq(novelRankings.period, period), eq(novelRankings.periodStart, latest)))
      .orderBy(asc(novelRankings.rank))
      .limit(limit),
    previous
      ? db
          .select({ slug: novels.slug, rank: novelRankings.rank })
          .from(novelRankings)
          .innerJoin(novels, eq(novels.id, novelRankings.novelId))
          .where(and(
            eq(novelRankings.period, period),
            eq(novelRankings.periodStart, previous),
            inArray(novels.slug, rankedSlugs),
          ))
          .limit(limit)
      : Promise.resolve([]),
  ]);
  const currentBySlug = new Map(currentRows.map((row) => [row.slug, row.rank]));
  const previousBySlug = new Map(previousRows.map((row) => [row.slug, row.rank]));

  return rankedNovels.map((novel, index) => {
    const rank = currentBySlug.get(novel.slug) ?? index + 1;
    if (!previous) return { novel, rank };
    const previousRank = previousBySlug.get(novel.slug);
    if (previousRank === undefined) return { novel, rank, movement: { direction: "new" } };
    const delta = previousRank - rank;
    if (delta === 0) return { novel, rank, movement: { direction: "same" } };
    return {
      novel,
      rank,
      movement: {
        direction: delta > 0 ? "up" : "down",
        places: Math.abs(delta),
      },
    };
  });
});

/**
 * Real seven-day engagement inside one public genre. This powers the editorial
 * "rising" shelf without pretending that recently published or globally
 * popular titles are gaining momentum in this specific genre.
 */
export const getGenreRising = cache(async (slugInput: string, requestedLimit = 6): Promise<Novel[]> => {
  const slug = cleanText(slugInput, 120);
  if (!slug) return [];
  const limit = clampLimit(requestedLimit, 6, 12);

  return getOrSetVersioned({
    versionKeys: [cacheKeys.versions.ranking(), cacheKeys.versions.catalog(), cacheKeys.versions.taxonomy()],
    key: ([rankingVersion, catalogVersion, taxonomyVersion]) =>
      cacheKeys.ranking(`genre-${slug}-c${catalogVersion}-t${taxonomyVersion}`, limit, rankingVersion),
    ttlSeconds: CACHE_TTL_SECONDS.RANKING,
    category: "ranking",
    loader: async () => {
      const db = getDb();
      const now = new Date();
      const periodStart = bangkokDateKey(new Date(now.getTime() - 6 * 86_400_000));
      const periodEnd = bangkokDateKey(now);
      const score = sql<number>`
        ln(1 + coalesce(sum(${novelDailyStats.views}), 0)) * 1.5 +
        ln(1 + coalesce(sum(${novelDailyStats.uniqueReaders}), 0)) * 3 +
        ln(1 + coalesce(sum(${novelDailyStats.chapterReads}), 0)) * 2 +
        ln(1 + coalesce(sum(${novelDailyStats.libraryAdds}), 0)) * 6 +
        ln(1 + coalesce(sum(${novelDailyStats.ratings}), 0)) * 4
      `.mapWith(Number);
      const rankedRows = await db
        .select({ id: novels.id, score })
        .from(novelDailyStats)
        .innerJoin(novels, eq(novels.id, novelDailyStats.novelId))
        .innerJoin(novelGenres, eq(novelGenres.novelId, novels.id))
        .innerJoin(genres, eq(genres.id, novelGenres.genreId))
        .where(and(
          gte(novelDailyStats.statDate, periodStart),
          lte(novelDailyStats.statDate, periodEnd),
          eq(genres.slug, slug),
          eq(genres.isActive, true),
          publicNovelCondition(now),
        ))
        .groupBy(novels.id)
        .orderBy(desc(score), asc(novels.id))
        .limit(limit);
      if (!rankedRows.length) return [];

      const ids = rankedRows.map((row) => row.id);
      const rows = await selectBaseNovels(
        and(publicNovelCondition(now), inArray(novels.id, ids))!,
        orderBy("popular"),
        limit,
      );
      const byId = new Map((await hydrateNovels(rows)).map((novel) => [novel.id, novel]));
      return rankedRows.flatMap((row) => {
        const novel = byId.get(row.id);
        return novel ? [novel] : [];
      });
    },
  });
});

export const getGenreShowcase = unstable_cache(
  async (requestedLimit = 8) => {
    const limit = clampLimit(requestedLimit, 8, 12);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.homepage(), cacheKeys.versions.taxonomy()],
      key: ([homepageVersion, taxonomyVersion]) =>
        cacheKeys.home("genre-showcase", `${limit}-t${taxonomyVersion}`, homepageVersion),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_CATALOG,
      category: "homepage",
      loader: async () => {
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
          if (current.length < 3) {
            coverMap.set(row.genreSlug, [...current, assetUrl(row.coverKey, publicAssetFallbacks.novelCover)]);
          }
        }
        return publicGenres.map((genre) => ({ genre, covers: coverMap.get(genre.slug) ?? [] }));
      },
    });
  },
  ["public-genre-showcase-v3"],
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
  wordCount: number;
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
    publishedAt: row.publishedAt?.toISOString(),
    wordCount: row.wordCount,
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
  wordCount: chapters.wordCount,
  isFree: chapters.isFree,
  coinPrice: chapters.coinPrice,
};

async function getChapterPageUncached(slugInput: string, pageInput = 1): Promise<Paginated<ChapterSummary>> {
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
}

export const getChapterPage = cache(
  async (slugInput: string, pageInput = 1): Promise<Paginated<ChapterSummary>> => {
    const slug = cleanText(slugInput, 180);
    const page = parsePositivePage(pageInput);
    if (!slug || page > 200) return getChapterPageUncached(slugInput, pageInput);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.chapters(slug)],
      key: ([version]) => cacheKeys.chapterList(slug, page, version),
      ttlSeconds: CACHE_TTL_SECONDS.CHAPTER_LIST,
      category: "chapter-list",
      loader: () => getChapterPageUncached(slug, page),
    });
  },
);

export type ChapterCatalogOptions = {
  page?: string | number;
  order?: ChapterCatalogOrder;
  query?: string;
  rangeStart?: number | null;
  rangeEnd?: number | null;
  jumpChapter?: number | null;
};

/**
 * Server-side chapter catalogue query. Search, ordering, ranges, and jumping
 * are deliberately resolved before LIMIT/OFFSET so a 2,000-chapter novel does
 * not present the first page as if it were the latest or searchable globally.
 * Free-text variants stay outside the persistent cache to avoid unbounded keys.
 */
export async function getChapterCatalogPage(
  slugInput: string,
  options: ChapterCatalogOptions = {},
): Promise<ChapterCatalogPage> {
  const slug = cleanText(slugInput, 180);
  const order: ChapterCatalogOrder = options.order === "oldest" ? "oldest" : "latest";
  const query = cleanText(options.query, MAX_SEARCH_LENGTH) ?? "";
  const rangeStart = Number.isSafeInteger(options.rangeStart) && (options.rangeStart ?? 0) > 0
    ? Math.max(1, Number(options.rangeStart))
    : null;
  const rangeEnd = rangeStart !== null
    ? Number.isSafeInteger(options.rangeEnd) && Number(options.rangeEnd) >= rangeStart
      ? Math.min(Number(options.rangeEnd), 100_000_000)
      : Math.min(rangeStart + CHAPTER_PAGE_SIZE - 1, 100_000_000)
    : null;
  const jumpChapter = typeof options.jumpChapter === "number" && Number.isFinite(options.jumpChapter) && options.jumpChapter >= 0
    ? options.jumpChapter
    : null;
  const requestedPage = parsePositivePage(options.page);

  if (!slug) {
    return {
      items: [], page: 1, pageSize: CHAPTER_PAGE_SIZE, total: 0, totalPages: 1,
      catalogTotal: 0, order, query, rangeStart, rangeEnd, jumpChapter, jumpFound: false,
    };
  }

  const now = new Date();
  const baseCondition = and(eq(novels.slug, slug), publicNovelCondition(now), publicChapterCondition(now));
  const filteredCondition = and(
    baseCondition,
    ...(rangeStart !== null ? [gte(chapters.sortOrder, rangeStart)] : []),
    ...(rangeEnd !== null ? [lte(chapters.sortOrder, rangeEnd)] : []),
    ...(query
      ? [or(
          ilike(chapters.title, safeSearchPattern(query)),
          sql`${chapters.chapterNumber}::text ilike ${safeSearchPattern(query)}`,
        )]
      : []),
  );
  const db = getDb();
  const [catalogCountRows, filteredCountRows] = await Promise.all([
    db
      .select({ value: countDistinct(chapters.id) })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(baseCondition),
    db
      .select({ value: countDistinct(chapters.id) })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(filteredCondition),
  ]);
  const catalogTotal = Number(catalogCountRows[0]?.value ?? 0);
  const total = Number(filteredCountRows[0]?.value ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / CHAPTER_PAGE_SIZE));

  let jumpFound = false;
  let page = Math.min(requestedPage, totalPages);
  if (jumpChapter !== null) {
    const [target] = await db
      .select({ id: chapters.id, sortOrder: chapters.sortOrder })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(filteredCondition, eq(chapters.chapterNumber, jumpChapter)))
      .limit(1);
    if (target) {
      jumpFound = true;
      const [preceding] = await db
        .select({ value: countDistinct(chapters.id) })
        .from(chapters)
        .innerJoin(novels, eq(novels.id, chapters.novelId))
        .where(and(
          filteredCondition,
          order === "oldest"
            ? sql`${chapters.sortOrder} < ${target.sortOrder}`
            : sql`${chapters.sortOrder} > ${target.sortOrder}`,
        ));
      page = Math.min(Math.floor(Number(preceding?.value ?? 0) / CHAPTER_PAGE_SIZE) + 1, totalPages);
    }
  }

  const rows = await db
    .select(chapterSummarySelection)
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(filteredCondition)
    .orderBy(
      order === "oldest" ? asc(chapters.sortOrder) : desc(chapters.sortOrder),
      order === "oldest" ? asc(chapters.id) : desc(chapters.id),
    )
    .limit(CHAPTER_PAGE_SIZE)
    .offset((page - 1) * CHAPTER_PAGE_SIZE);

  return {
    items: rows.map(chapterSummaryFromRow),
    page,
    pageSize: CHAPTER_PAGE_SIZE,
    total,
    totalPages,
    catalogTotal,
    order,
    query,
    rangeStart,
    rangeEnd,
    jumpChapter,
    jumpFound,
  };
}

export async function getChapters(slug: string, requestedLimit = CHAPTER_PAGE_SIZE) {
  const normalizedSlug = cleanText(slug, 180);
  const limit = clampLimit(requestedLimit, CHAPTER_PAGE_SIZE, CHAPTER_PAGE_SIZE);
  if (normalizedSlug && limit < CHAPTER_PAGE_SIZE) {
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.chapters(normalizedSlug)],
      key: ([version]) => cacheKeys.firstChapters(normalizedSlug, limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.CHAPTER_LIST,
      category: "chapter-list",
      loader: async () => {
        const now = new Date();
        const rows = await getDb()
          .select(chapterSummarySelection)
          .from(chapters)
          .innerJoin(novels, eq(novels.id, chapters.novelId))
          .where(and(eq(novels.slug, normalizedSlug), publicNovelCondition(now), publicChapterCondition(now)))
          .orderBy(asc(chapters.sortOrder), asc(chapters.id))
          .limit(limit);
        return rows.map(chapterSummaryFromRow);
      },
    });
  }
  const page = await getChapterPage(slug, 1);
  return page.items.slice(0, limit);
}

export const getLatestChapters = cache(
  async (slugInput: string, requestedLimit = 5) => {
    const slug = cleanText(slugInput, 180);
    if (!slug) return [];
    const limit = clampLimit(requestedLimit, 5, 20);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.chapters(slug)],
      key: ([version]) => cacheKeys.latestChapters(slug, limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.CHAPTER_LIST,
      category: "chapter-list",
      loader: async () => {
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
    });
  },
);

type ReaderChapterSnapshot = {
  published: ReturnType<typeof toPublicChapterCachePayload>;
  adjacent: { previous?: ChapterSummary; next?: ChapterSummary };
  chapterWindow: ChapterWindow;
};

type ReaderChapterWindowRow = Parameters<typeof chapterSummaryFromRow>[0] & {
  publicContent: string | null;
  readerPosition: number;
  readerTotal: number;
};

function emptyChapterWindow(): ChapterWindow {
  return { items: [], total: 0, startPosition: 0, endPosition: 0, hasEarlier: false, hasLater: false };
}

/**
 * Public reader snapshot selected in one database round trip. The CTE ranks
 * published chapters inside Postgres, returning only the visible drawer
 * window plus its two boundary rows. Paid content is replaced by the excerpt
 * before it can cross the shared-cache boundary.
 */
async function getReaderChapterSnapshotFresh(
  slug: string,
  chapterNumber: number,
  radius: number,
): Promise<ReaderChapterSnapshot | undefined> {
  const now = new Date();
  const db = getDb();
  const orderedChapters = db.$with("reader_ordered_chapters").as(
    db
      .select({
        id: chapters.id,
        novelSlug: sql<string>`${novels.slug}`.as("novel_slug"),
        chapterNumber: chapters.chapterNumber,
        sortOrder: chapters.sortOrder,
        chapterSlug: sql<string>`${chapters.slug}`.as("chapter_slug"),
        title: chapters.title,
        publishedAt: chapters.publishedAt,
        wordCount: chapters.wordCount,
        isFree: chapters.isFree,
        coinPrice: chapters.coinPrice,
        publicContent: sql<string | null>`case
          when ${chapters.chapterNumber} = ${chapterNumber} then case
            when ${chapters.isFree} then ${chapters.content}
            else nullif(left(coalesce(${chapters.excerpt}, ''), 1200), '')
          end
          else null
        end`.as("public_content"),
        readerPosition: sql<number>`(row_number() over (order by ${chapters.sortOrder}, ${chapters.id}))::integer`
          .as("reader_position"),
        readerTotal: sql<number>`(count(*) over ())::integer`.as("reader_total"),
      })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(and(eq(novels.slug, slug), publicNovelCondition(now), publicChapterCondition(now))),
  );
  const currentChapter = db.$with("reader_current_chapter").as(
    db
      .select({ currentPosition: sql<number>`${orderedChapters.readerPosition}`.as("current_position") })
      .from(orderedChapters)
      .where(eq(orderedChapters.chapterNumber, chapterNumber)),
  );
  const rows: ReaderChapterWindowRow[] = await db
    .with(orderedChapters, currentChapter)
    .select({
      id: orderedChapters.id,
      novelSlug: orderedChapters.novelSlug,
      chapterNumber: orderedChapters.chapterNumber,
      sortOrder: orderedChapters.sortOrder,
      slug: orderedChapters.chapterSlug,
      title: orderedChapters.title,
      publishedAt: orderedChapters.publishedAt,
      wordCount: orderedChapters.wordCount,
      isFree: orderedChapters.isFree,
      coinPrice: orderedChapters.coinPrice,
      publicContent: orderedChapters.publicContent,
      readerPosition: orderedChapters.readerPosition,
      readerTotal: orderedChapters.readerTotal,
    })
    .from(orderedChapters)
    .innerJoin(
      currentChapter,
      sql`${orderedChapters.readerPosition} between ${currentChapter.currentPosition} - ${radius + 1}
        and ${currentChapter.currentPosition} + ${radius + 1}`,
    )
    .orderBy(asc(orderedChapters.readerPosition));
  const currentIndex = rows.findIndex((row) => row.chapterNumber === chapterNumber);
  if (currentIndex < 0) return undefined;

  const current = rows[currentIndex];
  const visibleStart = Math.max(0, currentIndex - radius);
  const visibleEnd = Math.min(rows.length, currentIndex + radius + 1);
  const visibleRows = rows.slice(visibleStart, visibleEnd);
  const items = visibleRows.map(chapterSummaryFromRow);
  const total = Number(current.readerTotal);
  const startPosition = Number(visibleRows[0]?.readerPosition ?? current.readerPosition);
  const endPosition = Number(visibleRows.at(-1)?.readerPosition ?? current.readerPosition);

  return {
    published: toPublicChapterCachePayload({
      chapter: chapterSummaryFromRow(current),
      isFree: current.isFree,
      publicContent: current.publicContent,
    }),
    adjacent: {
      previous: rows[currentIndex - 1] ? chapterSummaryFromRow(rows[currentIndex - 1]) : undefined,
      next: rows[currentIndex + 1] ? chapterSummaryFromRow(rows[currentIndex + 1]) : undefined,
    },
    chapterWindow: {
      items,
      total,
      startPosition,
      endPosition,
      hasEarlier: startPosition > 1,
      hasLater: endPosition < total,
      earlierBoundary: visibleStart > 0 ? chapterSummaryFromRow(rows[visibleStart - 1]) : undefined,
      laterBoundary: visibleEnd < rows.length ? chapterSummaryFromRow(rows[visibleEnd]) : undefined,
    },
  };
}

async function getReaderChapterSnapshotFromSharedCache(slug: string, chapterNumber: number, radius: number) {
  return getOrSetVersioned({
    versionKeys: [cacheKeys.versions.chapters(slug)],
    key: ([version]) => cacheKeys.chapterReader(slug, `snapshot-v2-${chapterNumber}-${radius}`, version),
    ttlSeconds: CACHE_TTL_SECONDS.CHAPTER_READER,
    category: "chapter",
    loader: () => getReaderChapterSnapshotFresh(slug, chapterNumber, radius),
  });
}

const getReaderChapterSnapshotCached = unstable_cache(
  getReaderChapterSnapshotFromSharedCache,
  ["public-reader-chapter-snapshot-v2"],
  { revalidate: PUBLIC_CACHE_SECONDS, tags: ["public-chapters", "public-novels"] },
);

/**
 * The shared result contains only public chapter metadata, free content, or a
 * paid excerpt. Full paid content and entitlements stay on uncached user-bound
 * queries. Editorial mutations expire the public-chapters tag immediately.
 */
const getReaderChapterSnapshot = cache(async (
  slugInput: string,
  chapterNumberInput: string | number,
  requestedRadius = 24,
) => {
  const slug = cleanText(slugInput, 180);
  const chapterNumber = Number(chapterNumberInput);
  const radius = Math.min(Math.max(Math.floor(requestedRadius) || 24, 8), 40);
  if (!slug || !Number.isFinite(chapterNumber) || chapterNumber < 0) return undefined;
  return getReaderChapterSnapshotCached(slug, chapterNumber, radius);
});

export const getPublishedChapter = cache(async (slug: string, chapterNumber: string | number) =>
  (await getReaderChapterSnapshot(slug, chapterNumber))?.published,
);

export const getAdjacentChapters = cache(async (slug: string, chapterNumber: string | number) =>
  (await getReaderChapterSnapshot(slug, chapterNumber))?.adjacent ?? { previous: undefined, next: undefined },
);

export const getChapterWindow = cache(
  async (slug: string, chapterNumber: string | number, requestedRadius = 24): Promise<ChapterWindow> =>
    (await getReaderChapterSnapshot(slug, chapterNumber, requestedRadius))?.chapterWindow ?? emptyChapterWindow(),
);

export const getSimilarNovels = cache(
  async (slugInput: string, requestedLimit = 6) => {
    const limit = clampLimit(requestedLimit, 6, 12);
    const source = await getNovelBySlug(slugInput);
    if (!source || source.genres.length === 0) return [];
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.catalog()],
      key: ([version]) => cacheKeys.novelRelated(source.slug, "similar", limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_CATALOG,
      category: "novel",
      loader: async () => {
        const rows = await getNovelsUncached({ genre: source.genres.join(","), sort: "rating" }, limit + 1);
        return rows.filter((novel) => novel.slug !== source.slug).slice(0, limit);
      },
    });
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
    getOrSetVersioned({
      versionKeys: [cacheKeys.versions.homepage()],
      key: ([version]) => cacheKeys.home("updates", `${range}-${limit}`, version),
      ttlSeconds: CACHE_TTL_SECONDS.HOMEPAGE_LATEST,
      category: "homepage",
      loader: () => getUpdatesUncached(range, undefined, limit),
    }),
  ["public-updates-v4"],
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

async function getPublishedReviewsUncached(
  slugInput: string,
  requestedLimit = 10,
): Promise<Review[]> {
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
      authorName: row.authorName || "นักอ่าน NovelNow",
      authorImage: row.authorImage || (row.authorAvatarKey ? assetUrl(row.authorAvatarKey) : null),
      rating: row.score,
      title: row.title,
      content: row.content,
      isSpoiler: row.isSpoiler,
      createdAt: row.createdAt.toISOString(),
  }));
}

export const getPublishedReviews = cache(
  async (slugInput: string, requestedLimit = 10): Promise<Review[]> => {
    const slug = cleanText(slugInput, 180);
    if (!slug) return [];
    const limit = clampLimit(requestedLimit, 10, 20);
    return getOrSetVersioned({
      versionKeys: [cacheKeys.versions.reviews(slug)],
      key: ([version]) => cacheKeys.novelRelated(slug, "reviews", limit, version),
      ttlSeconds: CACHE_TTL_SECONDS.REVIEWS,
      category: "novel",
      loader: () => getPublishedReviewsUncached(slug, limit),
    });
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
  const [genreRows, tagRows, novelRows, chapterRows] = await Promise.all([
    getDb()
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(genres)
      .where(eq(genres.isActive, true)),
    getDb()
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(tags)
      .where(eq(tags.isActive, true)),
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
  const genreCount = genreRows[0]?.value ?? 0;
  const tagCount = tagRows[0]?.value ?? 0;
  const novelCount = novelRows[0]?.value ?? 0;
  const chapterCount = chapterRows[0]?.value ?? 0;
  const total = genreCount + tagCount + novelCount + chapterCount;
  return {
    genreCount,
    tagCount,
    novelCount,
    chapterCount,
    total,
    partitions: Math.max(1, Math.ceil(total / SITEMAP_PARTITION_SIZE)),
  };
}

export const getSitemapCounts = unstable_cache(getSitemapCountsUncached, ["public-sitemap-counts-v4"], {
  revalidate: PUBLIC_CACHE_TTL.sitemap,
  tags: ["public-sitemap", "public-taxonomy", "public-novels", "public-chapters"],
});

function sitemapSlice(offset: number, start: number, count: number, remaining: number) {
  if (
    remaining <= 0
    || offset >= start + count
    || offset + SITEMAP_PARTITION_SIZE <= start
  ) {
    return { offset: 0, take: 0 };
  }

  const localOffset = Math.max(0, offset - start);
  return {
    offset: localOffset,
    take: Math.min(remaining, Math.max(0, count - localOffset)),
  };
}

export const getSitemapPartition = unstable_cache(
  async (partitionInput: number) => {
    const partition = Number.isSafeInteger(partitionInput) && partitionInput >= 0 ? partitionInput : 0;
    const counts = await getSitemapCounts();
    const offset = partition * SITEMAP_PARTITION_SIZE;
    if (offset >= counts.total) return { genres: [], tags: [], novels: [], chapters: [] };

    const now = new Date();
    let remaining = SITEMAP_PARTITION_SIZE;

    const genreSlice = sitemapSlice(offset, 0, counts.genreCount, remaining);
    const genreRows = genreSlice.take > 0
      ? await getDb()
          .select({ slug: genres.slug, updatedAt: genres.updatedAt })
          .from(genres)
          .where(eq(genres.isActive, true))
          .orderBy(asc(genres.id))
          .limit(genreSlice.take)
          .offset(genreSlice.offset)
      : [];
    remaining -= genreRows.length;

    const tagStart = counts.genreCount;
    const tagSlice = sitemapSlice(offset, tagStart, counts.tagCount, remaining);
    const tagRows = tagSlice.take > 0
      ? await getDb()
          .select({ slug: tags.slug, updatedAt: tags.updatedAt })
          .from(tags)
          .where(eq(tags.isActive, true))
          .orderBy(asc(tags.id))
          .limit(tagSlice.take)
          .offset(tagSlice.offset)
      : [];
    remaining -= tagRows.length;

    const novelStart = tagStart + counts.tagCount;
    const novelSlice = sitemapSlice(offset, novelStart, counts.novelCount, remaining);
    const novelRows = novelSlice.take > 0
      ? await getDb()
          .select({ slug: novels.slug, updatedAt: novels.updatedAt, coverKey: novels.coverKey })
          .from(novels)
          .where(publicNovelCondition(now))
          .orderBy(asc(novels.id))
          .limit(novelSlice.take)
          .offset(novelSlice.offset)
      : [];
    remaining -= novelRows.length;

    const chapterStart = novelStart + counts.novelCount;
    const chapterSlice = sitemapSlice(offset, chapterStart, counts.chapterCount, remaining);
    const chapterRows = chapterSlice.take > 0
      ? await getDb()
          .select({ novelSlug: novels.slug, chapterNumber: chapters.chapterNumber, updatedAt: chapters.updatedAt })
          .from(chapters)
          .innerJoin(novels, eq(novels.id, chapters.novelId))
          .where(and(publicNovelCondition(now), publicChapterCondition(now)))
          .orderBy(asc(novels.id), asc(chapters.sortOrder), asc(chapters.id))
          .limit(chapterSlice.take)
          .offset(chapterSlice.offset)
      : [];

    return {
      genres: genreRows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updatedAt.toISOString(),
      })),
      tags: tagRows.map((row) => ({
        slug: row.slug,
        updatedAt: row.updatedAt.toISOString(),
      })),
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
  ["public-sitemap-partition-v4"],
  { revalidate: PUBLIC_CACHE_TTL.sitemap, tags: ["public-sitemap", "public-taxonomy", "public-novels", "public-chapters"] },
);
