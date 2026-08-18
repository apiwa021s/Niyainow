import "server-only";

import { and, desc, eq, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { after } from "next/server";

import { getDb } from "@/db";
import {
  authors,
  chapterUnlocks,
  chapters,
  novelAuthors,
  novelFollows,
  novelGenres,
  novelStatistics,
  novelTags,
  novels,
  ratings,
  readingHistory,
  readingProgress,
  reviews,
  tags,
  genres,
  userLibrary,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/dal";
import { isActiveUser } from "@/lib/auth/permissions";
import { ApiError } from "@/lib/http/api-response";
import {
  invalidateEngagementCache,
  invalidatePublishedReviewsCache,
} from "@/lib/redis/invalidation";
import { assetUrl, publicAssetFallbacks } from "@/lib/site-config";
import {
  collectionPagination,
  type CollectionPagination,
} from "@/lib/validation/collection-pagination";
import type { Novel } from "@/types/novel";

import {
  membershipCountDelta,
  publishedReviewCountDelta,
  ratingAggregateDelta,
  shouldPersistProgress,
} from "./user-domain";

export type LibraryStatus = "READING" | "PLAN_TO_READ" | "COMPLETED" | "DROPPED";

function revalidateEngagement(novelSlug: string) {
  // Reader actions only invalidate the affected detail. Global discovery and
  // ranking caches refresh on their bounded TTL instead of churning on every
  // follow, library update, or rating.
  after(() => invalidateEngagementCache(novelSlug));
}

function expirePublishedReviews(novelSlug: string) {
  // Review edits/deletes can remove previously public text, so this content
  // boundary must never serve one stale response.
  revalidateTag("public-reviews", { expire: 0 });
  after(() => invalidatePublishedReviewsCache(novelSlug));
}

type NovelProjectionRow = {
  novelId: string;
  slug: string;
  title: string;
  titleOriginal: string | null;
  synopsis: string;
  coverKey: string | null;
  bannerKey: string | null;
  status: "ONGOING" | "COMPLETED" | "HIATUS" | "CANCELLED";
  isFeatured: boolean;
  publishedAt: Date | null;
  latestChapterAt: Date | null;
  ratingAverage: number | null;
  viewCount: number | null;
  publishedChapters: number | null;
  libraryCount: number | null;
  authorName: string;
  genreSlugs: string[];
  genreNames: Record<string, string>;
  tagNames: string[];
  latestChapterNumber: number | null;
  latestChapterSlug: string | null;
  latestChapterTitle: string | null;
};

const novelProjection = {
  novelId: novels.id,
  slug: novels.slug,
  title: novels.title,
  titleOriginal: novels.titleOriginal,
  synopsis: novels.synopsis,
  coverKey: novels.coverKey,
  bannerKey: novels.bannerKey,
  status: novels.status,
  isFeatured: novels.isFeatured,
  publishedAt: novels.publishedAt,
  latestChapterAt: novels.latestChapterAt,
  ratingAverage: novelStatistics.ratingAverage,
  viewCount: novelStatistics.viewCount,
  publishedChapters: novelStatistics.publishedChapters,
  libraryCount: novelStatistics.libraryCount,
  authorName: sql<string>`coalesce((
    select ${authors.name}
    from ${novelAuthors}
    inner join ${authors} on ${authors.id} = ${novelAuthors.authorId}
    where ${novelAuthors.novelId} = ${novels.id}
    order by case ${novelAuthors.role}
      when 'AUTHOR' then 0 when 'ORIGINAL_AUTHOR' then 1 else 2 end,
      ${novelAuthors.sortOrder}, ${authors.id}
    limit 1
  ), 'ไม่ระบุผู้แต่ง')`,
  genreSlugs: sql<string[]>`coalesce((
    select array_agg(${genres.slug} order by ${novelGenres.sortOrder}, ${genres.slug})
    from ${novelGenres}
    inner join ${genres} on ${genres.id} = ${novelGenres.genreId}
    where ${novelGenres.novelId} = ${novels.id}
  ), array[]::text[])`,
  genreNames: sql<Record<string, string>>`coalesce((
    select jsonb_object_agg(${genres.slug}, coalesce(${genres.thaiName}, ${genres.name}))
    from ${novelGenres}
    inner join ${genres} on ${genres.id} = ${novelGenres.genreId}
    where ${novelGenres.novelId} = ${novels.id}
  ), '{}'::jsonb)`,
  tagNames: sql<string[]>`coalesce((
    select array_agg(${tags.name} order by ${tags.name})
    from ${novelTags}
    inner join ${tags} on ${tags.id} = ${novelTags.tagId}
    where ${novelTags.novelId} = ${novels.id}
  ), array[]::text[])`,
  latestChapterNumber: sql<number | null>`(
    select ${chapters.chapterNumber}
    from ${chapters}
    where ${chapters.id} = ${novelStatistics.latestChapterId}
    limit 1
  )`,
  latestChapterSlug: sql<string | null>`(
    select ${chapters.slug}
    from ${chapters}
    where ${chapters.id} = ${novelStatistics.latestChapterId}
    limit 1
  )`,
  latestChapterTitle: sql<string | null>`(
    select ${chapters.title}
    from ${chapters}
    where ${chapters.id} = ${novelStatistics.latestChapterId}
    limit 1
  )`,
};

function mapNovel(row: NovelProjectionRow): Novel {
  const updatedAt = row.latestChapterAt ?? row.publishedAt;
  const status: Novel["status"] =
    row.status === "COMPLETED" ? "completed" : row.status === "ONGOING" ? "ongoing" : "hiatus";

  return {
    id: row.novelId,
    slug: row.slug,
    title: row.titleOriginal || row.title,
    thaiTitle: row.title,
    author: row.authorName,
    genres: row.genreSlugs,
    genreNames: row.genreNames,
    tags: row.tagNames,
    status,
    rating: Number(row.ratingAverage ?? 0),
    views: Number(row.viewCount ?? 0),
    chapters: row.publishedChapters ?? 0,
    synopsis: row.synopsis,
    cover: assetUrl(row.coverKey, publicAssetFallbacks.novelCover),
    backdrop: assetUrl(row.bannerKey, publicAssetFallbacks.novelBackdrop),
    updatedAt: updatedAt?.toISOString() ?? "",
    featured: row.isFeatured,
    completed: status === "completed",
    bookmarkCount: row.libraryCount ?? 0,
    latestChapterTitle: row.latestChapterTitle ?? undefined,
    publishedAt: row.publishedAt?.toISOString(),
    latestChapter:
      row.latestChapterNumber !== null && row.latestChapterTitle
        ? { number: row.latestChapterNumber, title: row.latestChapterTitle }
        : undefined,
  };
}

function publicNovelWhere(slug?: string) {
  return and(
    eq(novels.publicationStatus, "PUBLISHED"),
    isNull(novels.deletedAt),
    lte(novels.publishedAt, new Date()),
    ...(slug ? [eq(novels.slug, slug)] : []),
  );
}

function publicChapterWhere() {
  return and(
    eq(chapters.status, "PUBLISHED"),
    isNull(chapters.deletedAt),
    lte(chapters.publishedAt, new Date()),
  );
}

async function resolvePublicNovel(slug: string) {
  const [novel] = await getDb()
    .select({ id: novels.id, slug: novels.slug })
    .from(novels)
    .where(publicNovelWhere(slug))
    .limit(1);

  if (!novel) throw new ApiError(404, "NOVEL_NOT_FOUND", "ไม่พบนิยายที่เผยแพร่");
  return novel;
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "AUTHENTICATION_REQUIRED", "กรุณาเข้าสู่ระบบ");
  if (!isActiveUser(user)) throw new ApiError(403, "ACCOUNT_DISABLED", "บัญชีนี้ไม่พร้อมใช้งาน");
  return user;
}

export type UserNovelListItem = {
  novel: Novel;
  libraryStatus: LibraryStatus | null;
  progressPercent: number | null;
  position: number | null;
  chapter: { number: number; slug: string; title: string } | null;
  lastReadAt: string | null;
};

export type UserNovelCollectionPage = CollectionPagination & {
  items: UserNovelListItem[];
};

export async function listUserLibrary(
  userId: string,
  status?: LibraryStatus,
  limit = 48,
  offset = 0,
): Promise<UserNovelListItem[]> {
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 48, 1), 100);
  const safeOffset = Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
  const rows = await getDb()
    .select({
      ...novelProjection,
      libraryStatus: userLibrary.status,
      progressPercent: readingProgress.progressPercent,
      position: readingProgress.position,
      chapterNumber: chapters.chapterNumber,
      chapterSlug: chapters.slug,
      chapterTitle: chapters.title,
      lastReadAt: readingProgress.lastReadAt,
    })
    .from(userLibrary)
    .innerJoin(novels, eq(novels.id, userLibrary.novelId))
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .leftJoin(
      readingProgress,
      and(eq(readingProgress.userId, userLibrary.userId), eq(readingProgress.novelId, userLibrary.novelId)),
    )
    .leftJoin(chapters, and(eq(chapters.id, readingProgress.chapterId), publicChapterWhere()))
    .where(
      and(
        eq(userLibrary.userId, userId),
        publicNovelWhere(),
        ...(status ? [eq(userLibrary.status, status)] : []),
      ),
    )
    .orderBy(desc(userLibrary.updatedAt), desc(userLibrary.novelId))
    .limit(safeLimit)
    .offset(safeOffset);

  return rows.map((row) => ({
    novel: mapNovel(row as NovelProjectionRow),
    libraryStatus: row.libraryStatus,
    progressPercent: row.progressPercent,
    position: row.position,
    chapter:
      row.chapterNumber !== null && row.chapterSlug && row.chapterTitle
        ? { number: row.chapterNumber, slug: row.chapterSlug, title: row.chapterTitle }
        : null,
    lastReadAt: row.lastReadAt?.toISOString() ?? null,
  }));
}

export async function listUserLibraryPage(
  userId: string,
  status: LibraryStatus,
  requestedPage: number,
): Promise<UserNovelCollectionPage> {
  const [countRow] = await getDb()
    .select({ value: sql<number>`count(*)::int` })
    .from(userLibrary)
    .innerJoin(novels, eq(novels.id, userLibrary.novelId))
    .where(and(eq(userLibrary.userId, userId), eq(userLibrary.status, status), publicNovelWhere()));
  const pagination = collectionPagination(Number(countRow?.value ?? 0), requestedPage);
  const items = await listUserLibrary(
    userId,
    status,
    pagination.pageSize,
    (pagination.page - 1) * pagination.pageSize,
  );

  return { items, ...pagination };
}

export async function listReadingHistory(
  userId: string,
  limit = 48,
  offset = 0,
): Promise<UserNovelListItem[]> {
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 48, 1), 100);
  const safeOffset = Number.isSafeInteger(offset) && offset > 0 ? offset : 0;
  const rows = await getDb()
    .select({
      ...novelProjection,
      libraryStatus: userLibrary.status,
      progressPercent: readingProgress.progressPercent,
      position: readingProgress.position,
      chapterNumber: chapters.chapterNumber,
      chapterSlug: chapters.slug,
      chapterTitle: chapters.title,
      lastReadAt: readingHistory.lastReadAt,
    })
    .from(readingHistory)
    .innerJoin(novels, eq(novels.id, readingHistory.novelId))
    .innerJoin(chapters, eq(chapters.id, readingHistory.chapterId))
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .leftJoin(
      readingProgress,
      and(eq(readingProgress.userId, readingHistory.userId), eq(readingProgress.novelId, readingHistory.novelId)),
    )
    .leftJoin(
      userLibrary,
      and(eq(userLibrary.userId, readingHistory.userId), eq(userLibrary.novelId, readingHistory.novelId)),
    )
    .where(and(eq(readingHistory.userId, userId), publicNovelWhere(), publicChapterWhere()))
    .orderBy(desc(readingHistory.lastReadAt), desc(readingHistory.novelId))
    .limit(safeLimit)
    .offset(safeOffset);

  return rows.map((row) => ({
    novel: mapNovel(row as NovelProjectionRow),
    libraryStatus: row.libraryStatus,
    progressPercent: row.progressPercent,
    position: row.position,
    chapter: { number: row.chapterNumber, slug: row.chapterSlug, title: row.chapterTitle },
    lastReadAt: row.lastReadAt.toISOString(),
  }));
}

export async function listReadingHistoryPage(
  userId: string,
  requestedPage: number,
): Promise<UserNovelCollectionPage> {
  const [countRow] = await getDb()
    .select({ value: sql<number>`count(*)::int` })
    .from(readingHistory)
    .innerJoin(novels, eq(novels.id, readingHistory.novelId))
    .innerJoin(chapters, eq(chapters.id, readingHistory.chapterId))
    .where(and(eq(readingHistory.userId, userId), publicNovelWhere(), publicChapterWhere()));
  const pagination = collectionPagination(Number(countRow?.value ?? 0), requestedPage);
  const items = await listReadingHistory(
    userId,
    pagination.pageSize,
    (pagination.page - 1) * pagination.pageSize,
  );

  return { items, ...pagination };
}

export async function setLibraryStatus(userId: string, novelSlug: string, status: LibraryStatus) {
  const novel = await resolvePublicNovel(novelSlug);
  const now = new Date();

  const membershipAdded = await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);

    const [existing] = await tx
      .select({ status: userLibrary.status })
      .from(userLibrary)
      .where(and(eq(userLibrary.userId, userId), eq(userLibrary.novelId, novel.id)))
      .limit(1);

    await tx
      .insert(userLibrary)
      .values({
        userId,
        novelId: novel.id,
        status,
        startedAt: status === "READING" ? now : null,
        completedAt: status === "COMPLETED" ? now : null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [userLibrary.userId, userLibrary.novelId],
        set: {
          status,
          startedAt:
            status === "READING"
              ? sql`coalesce(${userLibrary.startedAt}, ${now})`
              : userLibrary.startedAt,
          completedAt: status === "COMPLETED" ? now : null,
          updatedAt: now,
        },
      });

    const delta = membershipCountDelta(Boolean(existing), true);
    if (delta !== 0) {
      await tx
        .update(novelStatistics)
        .set({ libraryCount: sql`${novelStatistics.libraryCount} + ${delta}`, updatedAt: now })
        .where(eq(novelStatistics.novelId, novel.id));
    }
    return delta > 0;
  });

  if (membershipAdded) revalidateEngagement(novel.slug);

  return { novelSlug: novel.slug, status };
}

export async function removeFromLibrary(userId: string, novelSlug: string) {
  const novel = await resolvePublicNovel(novelSlug);
  const now = new Date();

  const membershipRemoved = await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);
    const removed = await tx
      .delete(userLibrary)
      .where(and(eq(userLibrary.userId, userId), eq(userLibrary.novelId, novel.id)))
      .returning({ userId: userLibrary.userId });
    const delta = membershipCountDelta(removed.length > 0, false);
    if (delta !== 0) {
      await tx
        .update(novelStatistics)
        .set({ libraryCount: sql`greatest(${novelStatistics.libraryCount} + ${delta}, 0)`, updatedAt: now })
        .where(eq(novelStatistics.novelId, novel.id));
    }
    return delta < 0;
  });

  if (membershipRemoved) revalidateEngagement(novel.slug);

  return { novelSlug: novel.slug, removed: true };
}

export async function listFollows(userId: string, requestedLimit = 100) {
  const limit = Math.max(1, Math.min(200, Math.floor(requestedLimit) || 100));
  return getDb()
    .select({
      novelSlug: novels.slug,
      notificationsEnabled: novelFollows.notificationsEnabled,
      followedAt: novelFollows.followedAt,
    })
    .from(novelFollows)
    .innerJoin(novels, eq(novels.id, novelFollows.novelId))
    .where(and(eq(novelFollows.userId, userId), publicNovelWhere()))
    .orderBy(desc(novelFollows.followedAt), desc(novelFollows.novelId))
    .limit(limit);
}

/**
 * Resolve followed novels and their reader state in one query for the library UI.
 * `listFollows` intentionally remains the compact API representation used by
 * callers that only need follow metadata.
 */
export async function listFollowedNovels(
  userId: string,
  requestedLimit = 100,
  requestedOffset = 0,
): Promise<UserNovelListItem[]> {
  const limit = Math.max(1, Math.min(200, Math.floor(requestedLimit) || 100));
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
  const rows = await getDb()
    .select({
      ...novelProjection,
      libraryStatus: userLibrary.status,
      progressPercent: readingProgress.progressPercent,
      position: readingProgress.position,
      chapterNumber: chapters.chapterNumber,
      chapterSlug: chapters.slug,
      chapterTitle: chapters.title,
      followedAt: novelFollows.followedAt,
    })
    .from(novelFollows)
    .innerJoin(novels, eq(novels.id, novelFollows.novelId))
    .leftJoin(novelStatistics, eq(novelStatistics.novelId, novels.id))
    .leftJoin(
      readingProgress,
      and(eq(readingProgress.userId, novelFollows.userId), eq(readingProgress.novelId, novelFollows.novelId)),
    )
    .leftJoin(chapters, and(eq(chapters.id, readingProgress.chapterId), publicChapterWhere()))
    .leftJoin(
      userLibrary,
      and(eq(userLibrary.userId, novelFollows.userId), eq(userLibrary.novelId, novelFollows.novelId)),
    )
    .where(and(eq(novelFollows.userId, userId), publicNovelWhere()))
    .orderBy(desc(novelFollows.followedAt), desc(novelFollows.novelId))
    .limit(limit)
    .offset(offset);

  return rows.map((row) => ({
    novel: mapNovel(row as NovelProjectionRow),
    libraryStatus: row.libraryStatus,
    progressPercent: row.progressPercent,
    position: row.position,
    chapter:
      row.chapterNumber !== null && row.chapterSlug && row.chapterTitle
        ? { number: row.chapterNumber, slug: row.chapterSlug, title: row.chapterTitle }
        : null,
    // The following shelf labels this date as the time the title was followed.
    lastReadAt: row.followedAt.toISOString(),
  }));
}

export async function listFollowedNovelsPage(
  userId: string,
  requestedPage: number,
): Promise<UserNovelCollectionPage> {
  const [countRow] = await getDb()
    .select({ value: sql<number>`count(*)::int` })
    .from(novelFollows)
    .innerJoin(novels, eq(novels.id, novelFollows.novelId))
    .where(and(eq(novelFollows.userId, userId), publicNovelWhere()));
  const pagination = collectionPagination(Number(countRow?.value ?? 0), requestedPage);
  const items = await listFollowedNovels(
    userId,
    pagination.pageSize,
    (pagination.page - 1) * pagination.pageSize,
  );

  return { items, ...pagination };
}

export async function setFollow(
  userId: string,
  novelSlug: string,
  notificationsEnabled = true,
) {
  const novel = await resolvePublicNovel(novelSlug);
  const now = new Date();

  const followAdded = await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);
    const [existing] = await tx
      .select({ userId: novelFollows.userId })
      .from(novelFollows)
      .where(and(eq(novelFollows.userId, userId), eq(novelFollows.novelId, novel.id)))
      .limit(1);
    await tx
      .insert(novelFollows)
      .values({ userId, novelId: novel.id, notificationsEnabled, followedAt: now })
      .onConflictDoUpdate({
        target: [novelFollows.userId, novelFollows.novelId],
        set: { notificationsEnabled },
      });
    const delta = membershipCountDelta(Boolean(existing), true);
    if (delta !== 0) {
      await tx
        .update(novelStatistics)
        .set({ followerCount: sql`${novelStatistics.followerCount} + ${delta}`, updatedAt: now })
        .where(eq(novelStatistics.novelId, novel.id));
    }
    return delta > 0;
  });

  if (followAdded) revalidateEngagement(novel.slug);

  return { novelSlug: novel.slug, followed: true, notificationsEnabled };
}

export async function removeFollow(userId: string, novelSlug: string) {
  const novel = await resolvePublicNovel(novelSlug);
  const now = new Date();

  const followRemoved = await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);
    const removed = await tx
      .delete(novelFollows)
      .where(and(eq(novelFollows.userId, userId), eq(novelFollows.novelId, novel.id)))
      .returning({ userId: novelFollows.userId });
    const delta = membershipCountDelta(removed.length > 0, false);
    if (delta !== 0) {
      await tx
        .update(novelStatistics)
        .set({ followerCount: sql`greatest(${novelStatistics.followerCount} + ${delta}, 0)`, updatedAt: now })
        .where(eq(novelStatistics.novelId, novel.id));
    }
    return delta < 0;
  });

  if (followRemoved) revalidateEngagement(novel.slug);

  return { novelSlug: novel.slug, followed: false };
}

export type SaveProgressInput = {
  chapterId: string;
  progressPercent: number;
  position: number;
  completed: boolean;
};

export async function saveReadingProgress(userId: string, input: SaveProgressInput) {
  const [readingTarget] = await getDb()
    .select({
      novelId: novels.id,
      novelSlug: novels.slug,
      chapterId: chapters.id,
      chapterNumber: chapters.chapterNumber,
      chapterSlug: chapters.slug,
    })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .leftJoin(
      chapterUnlocks,
      and(eq(chapterUnlocks.chapterId, chapters.id), eq(chapterUnlocks.userId, userId)),
    )
    .where(
      and(
        eq(chapters.id, input.chapterId),
        eq(chapters.status, "PUBLISHED"),
        or(eq(chapters.isFree, true), isNotNull(chapterUnlocks.chapterId)),
        isNull(chapters.deletedAt),
        lte(chapters.publishedAt, new Date()),
        publicNovelWhere(),
      ),
    )
    .limit(1);
  if (!readingTarget) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนที่เผยแพร่");

  const novel = { id: readingTarget.novelId, slug: readingTarget.novelSlug };
  const chapter = {
    id: readingTarget.chapterId,
    number: readingTarget.chapterNumber,
    slug: readingTarget.chapterSlug,
  };

  const receivedAt = new Date();
  const result = await getDb().transaction(async (tx) => {
    // Serialize progress requests per user/novel, including the first insert.
    // A row lock alone cannot protect the no-row-yet race.
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${novel.id}`}, 0))`,
    );

    const [current] = await tx
      .select({
        chapterId: readingProgress.chapterId,
        progressPercent: readingProgress.progressPercent,
        position: readingProgress.position,
        completed: readingProgress.completed,
        updatedAt: readingProgress.updatedAt,
      })
      .from(readingProgress)
      .where(and(eq(readingProgress.userId, userId), eq(readingProgress.novelId, novel.id)))
      .limit(1);

    // If a request received later reached the lock first, this request is stale
    // and must not overwrite the newer snapshot.
    if (
      (current && current.updatedAt.getTime() > receivedAt.getTime()) ||
      !shouldPersistProgress(
        current ?? null,
        {
          chapterId: chapter.id,
          progressPercent: input.progressPercent,
          position: input.position,
          completed: input.completed,
        },
        receivedAt,
      )
    ) {
      return { updated: false, membershipAdded: false };
    }

    await tx
      .insert(readingProgress)
      .values({
        userId,
        novelId: novel.id,
        chapterId: chapter.id,
        progressPercent: input.progressPercent,
        position: input.position,
        completed: input.completed,
        lastReadAt: receivedAt,
        updatedAt: receivedAt,
      })
      .onConflictDoUpdate({
        target: [readingProgress.userId, readingProgress.novelId],
        set: {
          chapterId: chapter.id,
          progressPercent: input.progressPercent,
          position: input.position,
          completed: input.completed,
          lastReadAt: receivedAt,
          updatedAt: receivedAt,
        },
      });

    await tx
      .insert(readingHistory)
      .values({
        userId,
        novelId: novel.id,
        chapterId: chapter.id,
        firstReadAt: receivedAt,
        lastReadAt: receivedAt,
        readCount: 1,
      })
      .onConflictDoUpdate({
        target: [readingHistory.userId, readingHistory.novelId],
        set: {
          chapterId: chapter.id,
          lastReadAt: receivedAt,
          readCount: sql`case when ${readingHistory.chapterId} <> ${chapter.id}
            then ${readingHistory.readCount} + 1 else ${readingHistory.readCount} end`,
        },
      });

    const desiredStatus: LibraryStatus = input.completed ? "COMPLETED" : "READING";
    const transitionExistingLibrary = async (status: LibraryStatus) => {
      if (status === "COMPLETED" || status === desiredStatus) return;
      await tx
        .update(userLibrary)
        .set({
          status: desiredStatus,
          startedAt: sql`coalesce(${userLibrary.startedAt}, ${receivedAt})`,
          completedAt: desiredStatus === "COMPLETED"
            ? sql`coalesce(${userLibrary.completedAt}, ${receivedAt})`
            : userLibrary.completedAt,
          updatedAt: receivedAt,
        })
        .where(and(eq(userLibrary.userId, userId), eq(userLibrary.novelId, novel.id), eq(userLibrary.status, status)));
    };

    const [library] = await tx
      .select({ status: userLibrary.status })
      .from(userLibrary)
      .where(and(eq(userLibrary.userId, userId), eq(userLibrary.novelId, novel.id)))
      .limit(1);
    if (library) {
      await transitionExistingLibrary(library.status);
      return { updated: true, membershipAdded: false };
    }

    // Only a first-time library membership touches the shared novel counter.
    // Recheck after the counter lock to serialize with explicit add/remove.
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);
    const [afterLock] = await tx
      .select({ status: userLibrary.status })
      .from(userLibrary)
      .where(and(eq(userLibrary.userId, userId), eq(userLibrary.novelId, novel.id)))
      .limit(1);
    if (afterLock) {
      await transitionExistingLibrary(afterLock.status);
      return { updated: true, membershipAdded: false };
    }

    await tx.insert(userLibrary).values({
      userId,
      novelId: novel.id,
      status: desiredStatus,
      startedAt: receivedAt,
      completedAt: input.completed ? receivedAt : null,
      updatedAt: receivedAt,
    });
    await tx
      .update(novelStatistics)
      .set({
        libraryCount: sql`${novelStatistics.libraryCount} + 1`,
        updatedAt: receivedAt,
      })
      .where(eq(novelStatistics.novelId, novel.id));

    return { updated: true, membershipAdded: true };
  });

  if (result.membershipAdded) revalidateEngagement(novel.slug);

  return {
    updated: result.updated,
    throttled: !result.updated,
    novelSlug: novel.slug,
    chapterNumber: chapter.number,
  };
}

async function updateRatingAggregate(
  userId: string,
  novelId: string,
  score: number | null,
) {
  const now = new Date();
  return getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novelId} for update`);

    const [existing] = await tx
      .select({ score: ratings.score })
      .from(ratings)
      .where(and(eq(ratings.userId, userId), eq(ratings.novelId, novelId)))
      .limit(1);
    const previousScore = existing?.score ?? null;

    if (score === null) {
      await tx.delete(ratings).where(and(eq(ratings.userId, userId), eq(ratings.novelId, novelId)));
    } else {
      await tx
        .insert(ratings)
        .values({ userId, novelId, score, updatedAt: now })
        .onConflictDoUpdate({
          target: [ratings.userId, ratings.novelId],
          set: { score, updatedAt: now },
        });
    }

    const delta = ratingAggregateDelta(previousScore, score);
    if (delta.count === 0 && delta.sum === 0) return false;
    const nextCount = sql`greatest(${novelStatistics.ratingCount} + ${delta.count}, 0)`;
    const nextSum = sql`greatest(${novelStatistics.ratingSum} + ${delta.sum}, 0)`;
    await tx
      .update(novelStatistics)
      .set({
        ratingCount: nextCount,
        ratingSum: nextSum,
        ratingAverage: sql`case when ${nextCount} = 0 then 0
          else round((${nextSum})::numeric / ${nextCount}, 2) end`,
        updatedAt: now,
      })
      .where(eq(novelStatistics.novelId, novelId));
    return true;
  });
}

export async function setRating(userId: string, novelSlug: string, score: number) {
  const novel = await resolvePublicNovel(novelSlug);
  const changed = await updateRatingAggregate(userId, novel.id, score);
  if (changed) revalidateEngagement(novel.slug);
  return { novelSlug: novel.slug, score };
}

export async function removeRating(userId: string, novelSlug: string) {
  const novel = await resolvePublicNovel(novelSlug);
  const changed = await updateRatingAggregate(userId, novel.id, null);
  if (changed) revalidateEngagement(novel.slug);
  return { novelSlug: novel.slug, score: null };
}

export type SaveReviewInput = {
  novelSlug: string;
  title?: string | null;
  body: string;
  isSpoiler: boolean;
};

export async function saveReview(userId: string, input: SaveReviewInput) {
  const novel = await resolvePublicNovel(input.novelSlug);
  const now = new Date();
  let reviewId = "";

  const publicCountDelta = await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);

    const [before] = await tx
      .select({ status: reviews.status, deletedAt: reviews.deletedAt })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.novelId, novel.id)))
      .limit(1);

    const [saved] = await tx
      .insert(reviews)
      .values({
        userId,
        novelId: novel.id,
        title: input.title || null,
        body: input.body.trim(),
        isSpoiler: input.isSpoiler,
        status: "PENDING",
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.novelId],
        set: {
          title: input.title || null,
          body: input.body.trim(),
          isSpoiler: input.isSpoiler,
          status: "PENDING",
          moderationNote: null,
          moderatedBy: null,
          moderatedAt: null,
          deletedAt: null,
          updatedAt: now,
        },
      })
      .returning({ id: reviews.id });
    reviewId = saved.id;

    const delta = publishedReviewCountDelta(before ?? null, { status: "PENDING", deletedAt: null });
    if (delta !== 0) {
      await tx
        .update(novelStatistics)
        .set({ reviewCount: sql`greatest(${novelStatistics.reviewCount} + ${delta}, 0)`, updatedAt: now })
        .where(eq(novelStatistics.novelId, novel.id));
    }
    return delta;
  });

  if (publicCountDelta !== 0) {
    expirePublishedReviews(novel.slug);
  }

  return { id: reviewId, novelSlug: novel.slug, status: "PENDING" as const };
}

export async function removeReview(userId: string, novelSlug: string) {
  const novel = await resolvePublicNovel(novelSlug);
  const now = new Date();

  const publicCountDelta = await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId: novel.id }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novel.id} for update`);
    const [before] = await tx
      .select({ status: reviews.status, deletedAt: reviews.deletedAt })
      .from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.novelId, novel.id)))
      .limit(1);
    await tx
      .update(reviews)
      .set({ status: "HIDDEN", deletedAt: now, updatedAt: now })
      .where(and(eq(reviews.userId, userId), eq(reviews.novelId, novel.id)));
    const delta = publishedReviewCountDelta(before ?? null, { status: "HIDDEN", deletedAt: now });
    if (delta !== 0) {
      await tx
        .update(novelStatistics)
        .set({ reviewCount: sql`greatest(${novelStatistics.reviewCount} + ${delta}, 0)`, updatedAt: now })
        .where(eq(novelStatistics.novelId, novel.id));
    }
    return delta;
  });

  if (publicCountDelta !== 0) {
    expirePublishedReviews(novel.slug);
  }

  return { novelSlug: novel.slug, removed: true };
}

export type UserNovelState = {
  novelId: string;
  novelSlug: string;
  libraryStatus: LibraryStatus | null;
  followed: boolean;
  notificationsEnabled: boolean;
  progress: {
    chapterId: string;
    chapterNumber: number;
    chapterSlug: string;
    chapterTitle: string;
    chapterSortOrder: number;
    progressPercent: number;
    position: number;
    completed: boolean;
    lastReadAt: string;
  } | null;
  rating: number | null;
  review: {
    id: string;
    title: string | null;
    body: string;
    status: "PENDING" | "PUBLISHED" | "HIDDEN" | "REJECTED";
    isSpoiler: boolean;
    updatedAt: string;
  } | null;
};

export async function getUserNovelState(
  userId: string,
  slug: string,
  options: { includeReview?: boolean } = {},
): Promise<UserNovelState> {
  const [state] = await getDb()
    .select({
      novelId: novels.id,
      novelSlug: novels.slug,
      libraryStatus: userLibrary.status,
      followedNovelId: novelFollows.novelId,
      notificationsEnabled: novelFollows.notificationsEnabled,
      chapterId: chapters.id,
      chapterNumber: chapters.chapterNumber,
      chapterSlug: chapters.slug,
      chapterTitle: chapters.title,
      chapterSortOrder: chapters.sortOrder,
      progressPercent: readingProgress.progressPercent,
      position: readingProgress.position,
      completed: readingProgress.completed,
      lastReadAt: readingProgress.lastReadAt,
      rating: ratings.score,
    })
    .from(novels)
    .leftJoin(
      userLibrary,
      and(eq(userLibrary.userId, userId), eq(userLibrary.novelId, novels.id)),
    )
    .leftJoin(
      novelFollows,
      and(eq(novelFollows.userId, userId), eq(novelFollows.novelId, novels.id)),
    )
    .leftJoin(
      readingProgress,
      and(eq(readingProgress.userId, userId), eq(readingProgress.novelId, novels.id)),
    )
    .leftJoin(
      chapters,
      and(
        eq(chapters.id, readingProgress.chapterId),
        eq(chapters.novelId, novels.id),
        publicChapterWhere(),
      ),
    )
    .leftJoin(
      ratings,
      and(eq(ratings.userId, userId), eq(ratings.novelId, novels.id)),
    )
    .where(publicNovelWhere(slug))
    .limit(1);
  if (!state) throw new ApiError(404, "NOVEL_NOT_FOUND", "ไม่พบนิยายที่เผยแพร่");

  const [review] = options.includeReview
    ? await getDb()
        .select({
          id: reviews.id,
          title: reviews.title,
          body: reviews.body,
          status: reviews.status,
          isSpoiler: reviews.isSpoiler,
          updatedAt: reviews.updatedAt,
        })
        .from(reviews)
        .where(and(eq(reviews.userId, userId), eq(reviews.novelId, state.novelId), isNull(reviews.deletedAt)))
        .limit(1)
    : [];
  const hasProgress = state.chapterId !== null
    && state.chapterNumber !== null
    && state.chapterSlug !== null
    && state.chapterTitle !== null
    && state.chapterSortOrder !== null
    && state.progressPercent !== null
    && state.position !== null
    && state.completed !== null
    && state.lastReadAt !== null;

  return {
    novelId: state.novelId,
    novelSlug: state.novelSlug,
    libraryStatus: state.libraryStatus,
    followed: state.followedNovelId !== null,
    notificationsEnabled: state.notificationsEnabled ?? false,
    progress: hasProgress
      ? {
          chapterId: state.chapterId!,
          chapterNumber: state.chapterNumber!,
          chapterSlug: state.chapterSlug!,
          chapterTitle: state.chapterTitle!,
          chapterSortOrder: state.chapterSortOrder!,
          progressPercent: state.progressPercent!,
          position: state.position!,
          completed: state.completed!,
          lastReadAt: state.lastReadAt!.toISOString(),
        }
      : null,
    rating: state.rating,
    review: review
      ? { ...review, updatedAt: review.updatedAt.toISOString() }
      : null,
  };
}

export async function getProfileSummary(userId: string) {
  const [result] = await getDb().execute<{
    library_count: number;
    reading_count: number;
    completed_count: number;
    following_count: number;
    history_count: number;
  }>(sql`
    select
      (select count(*)::int from ${userLibrary} where ${userLibrary.userId} = ${userId}) as library_count,
      (select count(*)::int from ${userLibrary} where ${userLibrary.userId} = ${userId}
        and ${userLibrary.status} = 'READING') as reading_count,
      (select count(*)::int from ${userLibrary} where ${userLibrary.userId} = ${userId}
        and ${userLibrary.status} = 'COMPLETED') as completed_count,
      (select count(*)::int from ${novelFollows} where ${novelFollows.userId} = ${userId}) as following_count,
      (select count(*)::int from ${readingHistory} where ${readingHistory.userId} = ${userId}) as history_count
  `);

  return {
    libraryCount: Number(result?.library_count ?? 0),
    readingCount: Number(result?.reading_count ?? 0),
    completedCount: Number(result?.completed_count ?? 0),
    followingCount: Number(result?.following_count ?? 0),
    historyCount: Number(result?.history_count ?? 0),
  };
}

export type HomePersonalization = {
  continueReading: UserNovelListItem[];
  followedNovelSlugs: string[];
};

export async function getHomePersonalization(userId: string): Promise<HomePersonalization> {
  const [continueReading, follows] = await Promise.all([
    listReadingHistory(userId, 8),
    listFollows(userId),
  ]);
  return {
    continueReading,
    followedNovelSlugs: follows.map((follow) => follow.novelSlug),
  };
}
