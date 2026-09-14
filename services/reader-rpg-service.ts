import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapters,
  genres,
  novelClassAffinities,
  novelGenres,
  novels,
  readerAccounts,
  readerActivityEvents,
  readerChapterQualifications,
  readerClassExpEntries,
  readerClassProfiles,
  readerClassProgress,
  readerDailyProgress,
  readerReadingSessions,
} from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { READER_CLASSES, type ReaderClassId } from "@/lib/onboarding/reader-class";
import {
  READING_EXP_DAILY_CAP,
  allocateClassExp,
  classLevelProgress,
  classTitleFor,
  inferClassAffinities,
  levelProgress,
  minimumActiveReadingSeconds,
  readingExpForWordCount,
  rereadMultiplierMilli,
  type ClassAffinity,
} from "@/lib/onboarding/reader-rpg";
import { refreshReaderMissionProgress } from "@/services/reader-mission-service";

const BANGKOK_TIME_ZONE = "Asia/Bangkok";
const MAX_CREDITED_SAMPLE_GAP_SECONDS = 120;
const FIRST_SAMPLE_GRACE_SECONDS = 12;

export type ReadingEvidenceInput = {
  sessionId: string;
  activeSeconds: number;
  progressPercent: number;
};

function bangkokDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: BANGKOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function previousDateKey(dateKey: string) {
  const startOfDay = new Date(`${dateKey}T00:00:00+07:00`).getTime();
  return bangkokDateKey(new Date(startOfDay - 86_400_000));
}

function chooseAffinities(
  curated: ClassAffinity[],
  genreSlugs: string[],
) {
  const curatedTotal = curated.reduce((total, item) => total + item.weightMilli, 0);
  return curated.length > 0 && curatedTotal === 1_000
    ? curated
    : inferClassAffinities(genreSlugs);
}

function progression(classId: ReaderClassId, totalExpMilli: number, prestige: number) {
  const progress = classLevelProgress(totalExpMilli);
  return {
    classId,
    totalExpMilli,
    prestige,
    title: classTitleFor(classId, progress.level),
    ...progress,
  };
}

export async function getReaderRpgSummary(userId: string) {
  const today = bangkokDateKey(new Date());
  const [accountRows, classRows, profileRows, dailyRows] = await Promise.all([
    getDb().select().from(readerAccounts).where(eq(readerAccounts.userId, userId)).limit(1),
    getDb().select().from(readerClassProgress).where(eq(readerClassProgress.userId, userId)),
    getDb().select({
      mainClassId: readerClassProfiles.mainClassId,
      subClassIds: readerClassProfiles.subClassIds,
    }).from(readerClassProfiles).where(eq(readerClassProfiles.userId, userId)).limit(1),
    getDb().select().from(readerDailyProgress).where(and(
      eq(readerDailyProgress.userId, userId),
      eq(readerDailyProgress.activityDate, today),
    )).limit(1),
  ]);

  const account = accountRows[0];
  const profile = profileRows[0];
  const daily = dailyRows[0];
  const progressByClass = new Map(classRows.map((row) => [row.classId, row]));
  const totalReaderExp = account?.totalExp ?? 0;

  return {
    reader: {
      ...levelProgress(totalReaderExp),
      currentStreakDays: account?.currentStreakDays ?? 0,
      longestStreakDays: account?.longestStreakDays ?? 0,
      streakFreezesAvailable: account?.streakFreezesAvailable ?? 1,
    },
    identity: profile ? {
      mainClassId: profile.mainClassId,
      subClassIds: profile.subClassIds,
    } : null,
    classes: READER_CLASSES.map(({ id }) => {
      const row = progressByClass.get(id);
      return progression(id, row?.totalExpMilli ?? 0, row?.prestige ?? 0);
    }),
    today: {
      date: today,
      readingExpAwarded: daily?.readingExpAwarded ?? 0,
      readingExpCap: READING_EXP_DAILY_CAP,
      readingExpRemaining: Math.max(0, READING_EXP_DAILY_CAP - (daily?.readingExpAwarded ?? 0)),
      qualifiedChapterCount: daily?.qualifiedChapterCount ?? 0,
    },
  };
}

export type ReaderRpgSummary = Awaited<ReturnType<typeof getReaderRpgSummary>>;

export async function recordReadingEvidence(
  userId: string,
  chapterId: string,
  input: ReadingEvidenceInput,
) {
  const [target] = await getDb()
    .select({
      chapterId: chapters.id,
      novelId: chapters.novelId,
      wordCount: chapters.wordCount,
    })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(eq(chapters.id, chapterId))
    .limit(1);
  if (!target) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนที่อ่าน");

  const [curatedRows, genreRows, profileRows] = await Promise.all([
    getDb().select({
      classId: novelClassAffinities.classId,
      weightMilli: novelClassAffinities.weightMilli,
    }).from(novelClassAffinities).where(eq(novelClassAffinities.novelId, target.novelId)),
    getDb().select({ slug: genres.slug })
      .from(novelGenres)
      .innerJoin(genres, eq(genres.id, novelGenres.genreId))
      .where(eq(novelGenres.novelId, target.novelId)),
    getDb().select({ mainClassId: readerClassProfiles.mainClassId })
      .from(readerClassProfiles)
      .where(eq(readerClassProfiles.userId, userId))
      .limit(1),
  ]);
  const affinities = chooseAffinities(curatedRows, genreRows.map((row) => row.slug));
  const mainClassId = profileRows[0]?.mainClassId ?? null;
  const now = new Date();
  const today = bangkokDateKey(now);
  const progressBasisPoints = Math.round(Math.max(0, Math.min(100, input.progressPercent)) * 100);
  const reportedActiveSeconds = Math.max(0, Math.floor(input.activeSeconds));
  const requiredActiveSeconds = minimumActiveReadingSeconds(target.wordCount);

  const result = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${chapterId}`}, 0))`);

    const [existingSession] = await tx
      .select()
      .from(readerReadingSessions)
      .where(eq(readerReadingSessions.id, input.sessionId))
      .limit(1);
    if (existingSession && (existingSession.userId !== userId || existingSession.chapterId !== chapterId)) {
      throw new ApiError(409, "READING_SESSION_CONFLICT", "Reading session นี้ถูกใช้กับตอนอื่นแล้ว");
    }

    if (existingSession?.qualifiedAt) {
      return {
        status: "already_qualified" as const,
        activeSeconds: existingSession.activeSeconds,
        requiredActiveSeconds,
        progressPercent: existingSession.maxProgressBasisPoints / 100,
        readerExpAwarded: 0,
        classExp: [],
      };
    }

    const elapsedSeconds = existingSession
      ? Math.max(0, Math.floor((now.getTime() - existingSession.lastSampleAt.getTime()) / 1_000))
      : 0;
    const allowedIncrease = existingSession
      ? Math.min(MAX_CREDITED_SAMPLE_GAP_SECONDS, elapsedSeconds + 2)
      : FIRST_SAMPLE_GRACE_SECONDS;
    const previousActiveSeconds = existingSession?.activeSeconds ?? 0;
    const activeSeconds = Math.max(
      previousActiveSeconds,
      Math.min(reportedActiveSeconds, previousActiveSeconds + allowedIncrease),
    );
    const maxProgressBasisPoints = Math.max(
      existingSession?.maxProgressBasisPoints ?? 0,
      progressBasisPoints,
    );
    const suspiciousReason = reportedActiveSeconds > previousActiveSeconds + allowedIncrease + 20
      ? "active_time_jump"
      : existingSession?.suspiciousReason ?? null;

    if (existingSession) {
      await tx.update(readerReadingSessions).set({
        activeSeconds,
        maxProgressBasisPoints,
        sampleCount: existingSession.sampleCount + 1,
        suspiciousReason,
        lastSampleAt: now,
      }).where(eq(readerReadingSessions.id, input.sessionId));
    } else {
      await tx.insert(readerReadingSessions).values({
        id: input.sessionId,
        userId,
        novelId: target.novelId,
        chapterId,
        activeSeconds,
        maxProgressBasisPoints,
        sampleCount: 1,
        suspiciousReason,
        startedAt: now,
        lastSampleAt: now,
      });
    }

    if (maxProgressBasisPoints < 8_000 || activeSeconds < requiredActiveSeconds) {
      return {
        status: "tracking" as const,
        activeSeconds,
        requiredActiveSeconds,
        progressPercent: maxProgressBasisPoints / 100,
        readerExpAwarded: 0,
        classExp: [],
      };
    }

    // A second advisory lock serializes different chapters competing for the daily cap.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${today}:reading-exp`}, 0))`);
    const [qualification] = await tx
      .select()
      .from(readerChapterQualifications)
      .where(and(
        eq(readerChapterQualifications.userId, userId),
        eq(readerChapterQualifications.chapterId, chapterId),
      ))
      .limit(1);
    const previousQualifiedReads = qualification?.qualifiedReadCount ?? 0;
    const multiplierMilli = rereadMultiplierMilli(previousQualifiedReads);
    const uncappedReaderExp = Math.floor(readingExpForWordCount(target.wordCount) * multiplierMilli / 1_000);
    const [daily] = await tx
      .select()
      .from(readerDailyProgress)
      .where(and(
        eq(readerDailyProgress.userId, userId),
        eq(readerDailyProgress.activityDate, today),
      ))
      .limit(1);
    const readerExpAwarded = Math.min(
      uncappedReaderExp,
      Math.max(0, READING_EXP_DAILY_CAP - (daily?.readingExpAwarded ?? 0)),
    );
    const classExp = allocateClassExp(readerExpAwarded, affinities, mainClassId);
    const totalClassExpMilli = classExp.reduce((total, item) => total + item.expMilli, 0);

    const [event] = await tx.insert(readerActivityEvents).values({
      userId,
      eventType: "reading.chapter_qualified",
      readerExpDelta: readerExpAwarded,
      idempotencyKey: `reading-session:${input.sessionId}`,
      metadata: {
        chapterId,
        novelId: target.novelId,
        wordCount: target.wordCount,
        activeSeconds,
        progressPercent: maxProgressBasisPoints / 100,
        rereadNumber: previousQualifiedReads + 1,
        rereadMultiplierMilli: multiplierMilli,
        affinitySource: curatedRows.length > 0 ? "curated" : "inferred",
      },
      occurredAt: now,
    }).returning({ id: readerActivityEvents.id });

    await tx.insert(readerDailyProgress).values({
      userId,
      activityDate: today,
      readingExpAwarded: readerExpAwarded,
      qualifiedChapterCount: previousQualifiedReads === 0 ? 1 : 0,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: [readerDailyProgress.userId, readerDailyProgress.activityDate],
      set: {
        readingExpAwarded: sql`${readerDailyProgress.readingExpAwarded} + ${readerExpAwarded}`,
        qualifiedChapterCount: sql`${readerDailyProgress.qualifiedChapterCount} + ${previousQualifiedReads === 0 ? 1 : 0}`,
        updatedAt: now,
      },
    });

    await tx.insert(readerAccounts).values({ userId, updatedAt: now }).onConflictDoNothing();
    const [account] = await tx.select().from(readerAccounts)
      .where(eq(readerAccounts.userId, userId)).limit(1);
    const nextStreak = account.lastQualifiedReadDate === today
      ? account.currentStreakDays
      : account.lastQualifiedReadDate === previousDateKey(today)
        ? account.currentStreakDays + 1
        : 1;
    await tx.update(readerAccounts).set({
      totalExp: sql`${readerAccounts.totalExp} + ${readerExpAwarded}`,
      currentStreakDays: nextStreak,
      longestStreakDays: Math.max(account.longestStreakDays, nextStreak),
      lastQualifiedReadDate: today,
      updatedAt: now,
    }).where(eq(readerAccounts.userId, userId));

    if (classExp.length > 0) {
      await tx.insert(readerClassExpEntries).values(classExp.map((allocation) => ({
        eventId: event.id,
        userId,
        classId: allocation.classId,
        expMilli: allocation.expMilli,
        affinityWeightMilli: allocation.weightMilli,
        mainClassBonusBps: allocation.mainClassBonusBps,
        createdAt: now,
      })));

      for (const allocation of classExp) {
        await tx.insert(readerClassProgress).values({
          userId,
          classId: allocation.classId,
          totalExpMilli: allocation.expMilli,
          unlockedAt: now,
          lastExpAt: now,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [readerClassProgress.userId, readerClassProgress.classId],
          set: {
            totalExpMilli: sql`${readerClassProgress.totalExpMilli} + ${allocation.expMilli}`,
            lastExpAt: now,
            updatedAt: now,
          },
        });
      }
    }

    await tx.insert(readerChapterQualifications).values({
      userId,
      novelId: target.novelId,
      chapterId,
      qualifiedReadCount: 1,
      readerExpAwarded,
      classExpAwardedMilli: totalClassExpMilli,
      firstQualifiedAt: now,
      lastQualifiedAt: now,
    }).onConflictDoUpdate({
      target: [readerChapterQualifications.userId, readerChapterQualifications.chapterId],
      set: {
        qualifiedReadCount: sql`least(3, ${readerChapterQualifications.qualifiedReadCount} + 1)`,
        readerExpAwarded: sql`${readerChapterQualifications.readerExpAwarded} + ${readerExpAwarded}`,
        classExpAwardedMilli: sql`${readerChapterQualifications.classExpAwardedMilli} + ${totalClassExpMilli}`,
        lastQualifiedAt: now,
      },
    });
    await tx.update(readerReadingSessions).set({ qualifiedAt: now, lastSampleAt: now })
      .where(eq(readerReadingSessions.id, input.sessionId));

    return {
      status: "qualified" as const,
      activeSeconds,
      requiredActiveSeconds,
      progressPercent: maxProgressBasisPoints / 100,
      readerExpAwarded,
      classExp: classExp.map((allocation) => ({
        classId: allocation.classId,
        exp: allocation.expMilli / 1_000,
      })),
      dailyReadingExpRemaining: Math.max(
        0,
        READING_EXP_DAILY_CAP - (daily?.readingExpAwarded ?? 0) - readerExpAwarded,
      ),
    };
  });

  if (result.status === "qualified") {
    await refreshReaderMissionProgress(userId, now);
  }
  return result;
}

export async function setNovelClassAffinities(
  novelId: string,
  affinities: ClassAffinity[],
  source: "manual" | "import" | "inferred" = "manual",
) {
  const uniqueClasses = new Set(affinities.map((item) => item.classId));
  const total = affinities.reduce((sum, item) => sum + item.weightMilli, 0);
  if (!affinities.length || affinities.length !== uniqueClasses.size || total !== 1_000) {
    throw new ApiError(400, "INVALID_CLASS_AFFINITY", "Affinity ต้องไม่ซ้ำและมีผลรวมเท่ากับ 1.000");
  }

  return getDb().transaction(async (tx) => {
    await tx.delete(novelClassAffinities).where(eq(novelClassAffinities.novelId, novelId));
    return tx.insert(novelClassAffinities).values(affinities.map((item) => ({
      novelId,
      classId: item.classId,
      weightMilli: item.weightMilli,
      source,
    }))).returning();
  });
}
