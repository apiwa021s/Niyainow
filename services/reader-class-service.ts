import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  readerActivityEvents,
  readerAccounts,
  readerClassProfiles,
  readerClassProgress,
  type ReaderClassProfileRow,
} from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import {
  hiddenTraitFor,
  type QuizQuestionId,
  type ReaderClassProfile,
} from "@/lib/onboarding/reader-class";
import {
  readerClassProfileInputSchema,
  type ReaderClassProfileInput,
} from "@/lib/onboarding/reader-class-validation";

function mapReaderClassProfile(row: ReaderClassProfileRow): ReaderClassProfile | null {
  const parsed = readerClassProfileInputSchema.safeParse({
    version: 2,
    classId: row.mainClassId,
    subClassId: row.subClassId,
    subClassIds: row.subClassIds,
    selectedClassIds: row.selectedClassIds,
    answers: row.quizAnswers,
    completedAt: row.completedAt.toISOString(),
  });
  if (!parsed.success) return null;

  const trait = hiddenTraitFor(parsed.data.answers);
  return {
    ...parsed.data,
    hiddenTrait: trait.label,
    hiddenTraitEmoji: trait.emoji,
  };
}

export async function getReaderClassProfile(userId: string): Promise<ReaderClassProfile | null> {
  const [row] = await getDb()
    .select()
    .from(readerClassProfiles)
    .where(eq(readerClassProfiles.userId, userId))
    .limit(1);

  return row ? mapReaderClassProfile(row) : null;
}

/**
 * Saves the current identity and creates progress rows atomically. The event is
 * idempotent so retrying a request can never duplicate a future EXP grant.
 */
export async function saveReaderClassProfile(userId: string, input: ReaderClassProfileInput) {
  const parsed = readerClassProfileInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_READER_CLASS_PROFILE", "ข้อมูล Reader Class ไม่ถูกต้อง");
  }

  const profile = parsed.data;
  const completedAt = new Date(profile.completedAt);
  const now = new Date();

  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: readerClassProfiles.userId })
      .from(readerClassProfiles)
      .where(eq(readerClassProfiles.userId, userId))
      .limit(1);

    const [row] = await tx
      .insert(readerClassProfiles)
      .values({
        userId,
        profileVersion: profile.version,
        mainClassId: profile.classId,
        subClassId: profile.subClassId,
        subClassIds: profile.subClassIds,
        selectedClassIds: profile.selectedClassIds,
        quizAnswers: profile.answers as Record<QuizQuestionId, string>,
        completedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: readerClassProfiles.userId,
        set: {
          profileVersion: profile.version,
          mainClassId: profile.classId,
          subClassId: profile.subClassId,
          subClassIds: profile.subClassIds,
          selectedClassIds: profile.selectedClassIds,
          quizAnswers: profile.answers as Record<QuizQuestionId, string>,
          completedAt,
          updatedAt: now,
        },
      })
      .returning();

    await tx
      .insert(readerClassProgress)
      .values(profile.selectedClassIds.map((classId) => ({ userId, classId, unlockedAt: completedAt })))
      .onConflictDoNothing({ target: [readerClassProgress.userId, readerClassProgress.classId] });

    await tx.insert(readerAccounts).values({ userId, updatedAt: now }).onConflictDoNothing();

    await tx
      .insert(readerActivityEvents)
      .values({
        userId,
        eventType: existing ? "reader_class.profile_updated" : "reader_class.profile_completed",
        readerExpDelta: 0,
        idempotencyKey: `reader-class-profile:v${profile.version}:${profile.completedAt}`,
        metadata: {
          mainClassId: profile.classId,
          subClassId: profile.subClassId,
          subClassIds: profile.subClassIds,
          selectedClassIds: profile.selectedClassIds,
          profileVersion: profile.version,
        },
        occurredAt: now,
      })
      .onConflictDoNothing({
        target: [readerActivityEvents.userId, readerActivityEvents.idempotencyKey],
      });

    const mapped = row ? mapReaderClassProfile(row) : null;
    if (!mapped) throw new ApiError(500, "READER_CLASS_SAVE_FAILED", "บันทึก Reader Class ไม่สำเร็จ");
    return mapped;
  });
}
