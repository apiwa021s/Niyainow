import "server-only";

import { and, eq, gt, inArray, isNull, lte } from "drizzle-orm";

import { getDb } from "@/db";
import { chapterUnlocks, chapters, novels, readerMemberships } from "@/db/schema";
import {
  evaluateChapterAccess,
  type ChapterAccessDecision,
} from "@/lib/domain/chapter-access";

function publishedCondition(now: Date) {
  return and(
    eq(novels.publicationStatus, "PUBLISHED"),
    isNull(novels.deletedAt),
    lte(novels.publishedAt, now),
    eq(chapters.status, "PUBLISHED"),
    isNull(chapters.deletedAt),
    lte(chapters.publishedAt, now),
  );
}

export type ChapterAccessResult = ChapterAccessDecision & {
  chapterId: string;
  novelId: string;
  chapterNumber: number;
};

export async function canReadChapter(
  userId: string | null,
  chapterId: string,
  now = new Date(),
  options: { staffAccess?: boolean } = {},
): Promise<ChapterAccessResult | null> {
  const db = getDb();
  const [chapter] = await db
    .select({
      chapterId: chapters.id,
      novelId: chapters.novelId,
      chapterNumber: chapters.chapterNumber,
      writerId: novels.writerId,
      status: chapters.status,
      chapterPublishedAt: chapters.publishedAt,
      novelPublishStatus: novels.publicationStatus,
      novelPublishedAt: novels.publishedAt,
      novelDeletedAt: novels.deletedAt,
      chapterDeletedAt: chapters.deletedAt,
      accessMode: chapters.accessMode,
      coinPrice: chapters.coinPrice,
      publicAvailableAt: chapters.publicAvailableAt,
      publicAccessModeAfterEarlyAccess: chapters.publicAccessModeAfterEarlyAccess,
      publicCoinPrice: chapters.publicCoinPrice,
    })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!chapter) return null;

  const isPublished = chapter.status === "PUBLISHED"
    && chapter.novelPublishStatus === "PUBLISHED"
    && !chapter.novelDeletedAt
    && !chapter.chapterDeletedAt
    && Boolean(chapter.chapterPublishedAt && chapter.chapterPublishedAt <= now)
    && Boolean(chapter.novelPublishedAt && chapter.novelPublishedAt <= now);

  if (isPublished && options.staffAccess) {
    return {
      chapterId: chapter.chapterId,
      novelId: chapter.novelId,
      chapterNumber: chapter.chapterNumber,
      allowed: true,
      reason: "STAFF",
    };
  }

  let isPurchased = false;
  let isActiveMember = false;
  if (userId && isPublished) {
    const [purchase, membership] = await Promise.all([
      db
        .select({ chapterId: chapterUnlocks.chapterId })
        .from(chapterUnlocks)
        .where(and(eq(chapterUnlocks.userId, userId), eq(chapterUnlocks.chapterId, chapterId), isNull(chapterUnlocks.refundedAt)))
        .limit(1),
      chapter.writerId
        ? db
            .select({ id: readerMemberships.id })
            .from(readerMemberships)
            .where(and(
              eq(readerMemberships.readerId, userId),
              eq(readerMemberships.writerId, chapter.writerId),
              inArray(readerMemberships.status, ["active", "cancel_at_period_end"]),
              lte(readerMemberships.currentPeriodStart, now),
              gt(readerMemberships.currentPeriodEnd, now),
            ))
            .limit(1)
        : Promise.resolve([]),
    ]);
    isPurchased = purchase.length > 0;
    isActiveMember = membership.length > 0;
  }

  return {
    chapterId: chapter.chapterId,
    novelId: chapter.novelId,
    chapterNumber: chapter.chapterNumber,
    ...evaluateChapterAccess({
      isPublished,
      accessMode: chapter.accessMode,
      coinPrice: chapter.coinPrice,
      isPurchased,
      isActiveMember,
      now,
      publicAvailableAt: chapter.publicAvailableAt,
      publicAccessModeAfterEarlyAccess: chapter.publicAccessModeAfterEarlyAccess,
      publicCoinPrice: chapter.publicCoinPrice,
    }),
  };
}

export async function getAuthorizedChapterContent(access: ChapterAccessResult) {
  if (!access.allowed) return null;
  const now = new Date();
  const [chapter] = await getDb()
    .select({ content: chapters.content })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, access.chapterId), publishedCondition(now)))
    .limit(1);
  return chapter?.content ?? null;
}

export async function getReadableChapterContent(
  userId: string | null,
  chapterId: string,
  options: { staffAccess?: boolean } = {},
) {
  const now = new Date();
  const access = await canReadChapter(userId, chapterId, now, options);
  if (!access?.allowed) return { access, content: null };
  return { access, content: await getAuthorizedChapterContent(access) };
}
