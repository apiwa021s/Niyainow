import "server-only";

import { createHash } from "node:crypto";
import { and, asc, eq, inArray, notInArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  readerAccounts,
  readerActivityEvents,
  readerChapterQualifications,
  readerClassExpEntries,
  readerClassProfiles,
  readerCosmeticItems,
  readerCosmeticLoadouts,
  readerCosmeticUnlocks,
  readerMissionClaims,
  readerMissionDefinitions,
  readerMissionProgress,
  type ReaderMissionDefinitionRow,
} from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import {
  COSMETIC_SLOTS,
  missionPeriod,
  type CosmeticSlot,
  type ReaderCosmeticLoadout,
  type ReaderMissionDashboard,
  type ReaderMissionView,
} from "@/lib/onboarding/reader-missions";

type MissionMetrics = {
  qualified_chapters: number;
  main_class_chapters: number;
  distinct_novels: number;
  new_novels: number;
};

const STARTER_COSMETIC_IDS = ["frame-origin", "title-new-reader", "background-midnight"] as const;
const DUPLICATE_COSMETIC_EXP = 100;

function numeric(value: unknown) {
  return typeof value === "number" ? value : Number(value ?? 0);
}

async function periodMetrics(
  userId: string,
  start: Date,
  end: Date,
  mainClassId: string | null,
): Promise<MissionMetrics> {
  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const [reading] = await getDb().execute<{
    qualifiedChapters: number;
    distinctNovels: number;
    newNovels: number;
  }>(sql`
    select
      count(*) filter (
        where q.first_qualified_at >= ${startIso}::timestamptz and q.first_qualified_at < ${endIso}::timestamptz
      )::int as "qualifiedChapters",
      count(distinct q.novel_id) filter (
        where q.first_qualified_at >= ${startIso}::timestamptz and q.first_qualified_at < ${endIso}::timestamptz
      )::int as "distinctNovels",
      (
        select count(*)::int
        from (
          select first_read.novel_id
          from ${readerChapterQualifications} as first_read
          where first_read.user_id = ${userId}
          group by first_read.novel_id
          having min(first_read.first_qualified_at) >= ${startIso}::timestamptz
            and min(first_read.first_qualified_at) < ${endIso}::timestamptz
        ) as new_novels
      ) as "newNovels"
    from ${readerChapterQualifications} as q
    where q.user_id = ${userId}
  `);

  let mainClassChapters = 0;
  if (mainClassId) {
    const [mainReading] = await getDb().execute<{ count: number }>(sql`
      select count(distinct activity.metadata->>'chapterId')::int as "count"
      from ${readerActivityEvents} as activity
      inner join ${readerClassExpEntries} as class_exp
        on class_exp.event_id = activity.id
      where activity.user_id = ${userId}
        and class_exp.class_id = ${mainClassId}
        and activity.event_type = 'reading.chapter_qualified'
        and activity.occurred_at >= ${startIso}::timestamptz
        and activity.occurred_at < ${endIso}::timestamptz
        and coalesce((activity.metadata->>'rereadNumber')::int, 1) = 1
    `);
    mainClassChapters = numeric(mainReading?.count);
  }

  return {
    qualified_chapters: numeric(reading?.qualifiedChapters),
    main_class_chapters: mainClassChapters,
    distinct_novels: numeric(reading?.distinctNovels),
    new_novels: numeric(reading?.newNovels),
  };
}

function missionProgressValues(
  definitions: ReaderMissionDefinitionRow[],
  metrics: MissionMetrics,
) {
  const values = new Map<string, number>();
  for (const definition of definitions) {
    if (definition.metric === "complete_core") continue;
    values.set(definition.id, metrics[definition.metric]);
  }
  for (const definition of definitions) {
    if (definition.metric !== "complete_core") continue;
    values.set(
      definition.id,
      definition.prerequisiteMissionIds.filter((missionId) => {
        const prerequisite = definitions.find((candidate) => candidate.id === missionId);
        return prerequisite && (values.get(missionId) ?? 0) >= prerequisite.target;
      }).length,
    );
  }
  return values;
}

export async function refreshReaderMissionProgress(userId: string, now = new Date()) {
  const definitions = await getDb().select().from(readerMissionDefinitions)
    .where(eq(readerMissionDefinitions.isActive, true))
    .orderBy(asc(readerMissionDefinitions.sortOrder), asc(readerMissionDefinitions.id));
  if (definitions.length === 0) return;

  const [profile] = await getDb().select({ mainClassId: readerClassProfiles.mainClassId })
    .from(readerClassProfiles).where(eq(readerClassProfiles.userId, userId)).limit(1);

  for (const cadence of ["daily", "weekly"] as const) {
    const period = missionPeriod(cadence, now);
    const cadenceDefinitions = definitions.filter((definition) => definition.cadence === cadence);
    const metrics = await periodMetrics(userId, period.start, period.end, profile?.mainClassId ?? null);
    const values = missionProgressValues(cadenceDefinitions, metrics);

    await getDb().transaction(async (tx) => {
      for (const definition of cadenceDefinitions) {
        const progress = values.get(definition.id) ?? 0;
        await tx.insert(readerMissionProgress).values({
          userId,
          missionId: definition.id,
          periodKey: period.periodKey,
          progress,
          target: definition.target,
          completedAt: progress >= definition.target ? now : null,
          updatedAt: now,
        }).onConflictDoUpdate({
          target: [readerMissionProgress.userId, readerMissionProgress.missionId, readerMissionProgress.periodKey],
          set: {
            progress,
            target: definition.target,
            completedAt: progress >= definition.target
              ? sql`coalesce(${readerMissionProgress.completedAt}, ${now.toISOString()}::timestamptz)`
              : readerMissionProgress.completedAt,
            updatedAt: now,
          },
        });
      }
    });
  }
}

function loadoutFromRow(row: typeof readerCosmeticLoadouts.$inferSelect | undefined): ReaderCosmeticLoadout {
  return {
    profile_frame: row?.profileFrameId ?? null,
    card_effect: row?.cardEffectId ?? null,
    avatar_effect: row?.avatarEffectId ?? null,
    reader_title: row?.readerTitleId ?? null,
    badge: row?.badgeId ?? null,
    background: row?.backgroundId ?? null,
  };
}

function dashboardPeriod(
  cadence: "daily" | "weekly",
  now: Date,
  definitions: ReaderMissionDefinitionRow[],
  progressRows: (typeof readerMissionProgress.$inferSelect)[],
  claimedKeys: Set<string>,
) {
  const period = missionPeriod(cadence, now);
  const progressMap = new Map(
    progressRows
      .filter((row) => row.periodKey === period.periodKey)
      .map((row) => [row.missionId, row]),
  );
  const missions: ReaderMissionView[] = definitions
    .filter((definition) => definition.cadence === cadence)
    .map((definition) => {
      const progress = progressMap.get(definition.id)?.progress ?? 0;
      return {
        id: definition.id,
        cadence,
        title: definition.title,
        description: definition.description,
        progress: Math.min(progress, definition.target),
        target: definition.target,
        readerExpReward: definition.readerExpReward,
        grantsCosmeticBox: definition.grantsCosmeticBox,
        completed: progress >= definition.target,
        claimed: claimedKeys.has(`${definition.id}:${period.periodKey}`),
      };
    });
  return { periodKey: period.periodKey, endsAt: period.end.toISOString(), missions };
}

export async function getReaderMissionDashboard(userId: string, now = new Date()): Promise<ReaderMissionDashboard> {
  await refreshReaderMissionProgress(userId, now);
  const dailyPeriod = missionPeriod("daily", now);
  const weeklyPeriod = missionPeriod("weekly", now);
  const periodKeys = [...new Set([dailyPeriod.periodKey, weeklyPeriod.periodKey])];
  const [definitions, progressRows, claims, unlockRows, loadoutRows] = await Promise.all([
    getDb().select().from(readerMissionDefinitions)
      .where(eq(readerMissionDefinitions.isActive, true))
      .orderBy(asc(readerMissionDefinitions.sortOrder), asc(readerMissionDefinitions.id)),
    getDb().select().from(readerMissionProgress).where(and(
      eq(readerMissionProgress.userId, userId),
      inArray(readerMissionProgress.periodKey, periodKeys),
    )),
    getDb().select({ missionId: readerMissionClaims.missionId, periodKey: readerMissionClaims.periodKey })
      .from(readerMissionClaims).where(and(
        eq(readerMissionClaims.userId, userId),
        inArray(readerMissionClaims.periodKey, periodKeys),
      )),
    getDb().select({
      id: readerCosmeticItems.id,
      name: readerCosmeticItems.name,
      description: readerCosmeticItems.description,
      slot: readerCosmeticItems.slot,
      rarity: readerCosmeticItems.rarity,
      config: readerCosmeticItems.visualConfig,
      unlockedAt: readerCosmeticUnlocks.unlockedAt,
    }).from(readerCosmeticUnlocks)
      .innerJoin(readerCosmeticItems, eq(readerCosmeticItems.id, readerCosmeticUnlocks.cosmeticItemId))
      .where(and(eq(readerCosmeticUnlocks.userId, userId), eq(readerCosmeticItems.isActive, true)))
      .orderBy(asc(readerCosmeticItems.sortOrder), asc(readerCosmeticItems.id)),
    getDb().select().from(readerCosmeticLoadouts)
      .where(eq(readerCosmeticLoadouts.userId, userId)).limit(1),
  ]);
  const claimedKeys = new Set(claims.map((claim) => `${claim.missionId}:${claim.periodKey}`));
  const loadout = loadoutFromRow(loadoutRows[0]);

  return {
    daily: dashboardPeriod("daily", now, definitions, progressRows, claimedKeys),
    weekly: dashboardPeriod("weekly", now, definitions, progressRows, claimedKeys),
    cosmetics: {
      loadout,
      items: unlockRows.map((item) => ({
        ...item,
        unlockedAt: item.unlockedAt.toISOString(),
        equipped: loadout[item.slot] === item.id,
      })),
    },
  };
}

function deterministicIndex(seed: string, length: number) {
  if (length <= 1) return 0;
  return createHash("sha256").update(seed).digest().readUInt32BE(0) % length;
}

export async function claimReaderMission(userId: string, missionId: string) {
  const now = new Date();
  await refreshReaderMissionProgress(userId, now);
  const [definition] = await getDb().select().from(readerMissionDefinitions)
    .where(and(eq(readerMissionDefinitions.id, missionId), eq(readerMissionDefinitions.isActive, true)))
    .limit(1);
  if (!definition) throw new ApiError(404, "MISSION_NOT_FOUND", "ไม่พบภารกิจนี้");
  const period = missionPeriod(definition.cadence, now);

  const reward = await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:${missionId}:${period.periodKey}`}, 0))`);
    const [existing] = await tx.select().from(readerMissionClaims).where(and(
      eq(readerMissionClaims.userId, userId),
      eq(readerMissionClaims.missionId, missionId),
      eq(readerMissionClaims.periodKey, period.periodKey),
    )).limit(1);
    if (existing) {
      return {
        alreadyClaimed: true,
        readerExpAwarded: existing.readerExpAwarded,
        cosmeticItemId: existing.cosmeticItemId,
        duplicateCosmeticExp: Math.max(0, existing.readerExpAwarded - definition.readerExpReward),
      };
    }

    const [progress] = await tx.select().from(readerMissionProgress).where(and(
      eq(readerMissionProgress.userId, userId),
      eq(readerMissionProgress.missionId, missionId),
      eq(readerMissionProgress.periodKey, period.periodKey),
    )).limit(1);
    if (!progress || progress.progress < definition.target) {
      throw new ApiError(409, "MISSION_INCOMPLETE", "ภารกิจนี้ยังไม่สำเร็จ");
    }

    let cosmeticItemId: string | null = null;
    let duplicateCosmeticExp = 0;
    if (definition.grantsCosmeticBox) {
      const catalog = await tx.select({ id: readerCosmeticItems.id }).from(readerCosmeticItems)
        .where(and(
          eq(readerCosmeticItems.isActive, true),
          notInArray(readerCosmeticItems.id, [...STARTER_COSMETIC_IDS]),
        ))
        .orderBy(asc(readerCosmeticItems.sortOrder), asc(readerCosmeticItems.id));
      const owned = await tx.select({ id: readerCosmeticUnlocks.cosmeticItemId })
        .from(readerCosmeticUnlocks)
        .where(eq(readerCosmeticUnlocks.userId, userId));
      const ownedIds = new Set(owned.map((item) => item.id));
      const available = catalog.filter((item) => !ownedIds.has(item.id));
      cosmeticItemId = available[
        deterministicIndex(`${userId}:${missionId}:${period.periodKey}`, available.length)
      ]?.id ?? null;
      if (catalog.length > 0 && available.length === 0) duplicateCosmeticExp = DUPLICATE_COSMETIC_EXP;
    }

    const readerExpAwarded = definition.readerExpReward + duplicateCosmeticExp;

    await tx.insert(readerAccounts).values({ userId, updatedAt: now }).onConflictDoNothing();
    await tx.update(readerAccounts).set({
      totalExp: sql`${readerAccounts.totalExp} + ${readerExpAwarded}`,
      updatedAt: now,
    }).where(eq(readerAccounts.userId, userId));

    const [event] = await tx.insert(readerActivityEvents).values({
      userId,
      eventType: "mission.reward_claimed",
      readerExpDelta: readerExpAwarded,
      idempotencyKey: `mission:${missionId}:${period.periodKey}`,
      metadata: {
        missionId,
        cadence: definition.cadence,
        periodKey: period.periodKey,
        progress: progress.progress,
        cosmeticItemId,
        duplicateCosmeticExp,
      },
      occurredAt: now,
    }).returning({ id: readerActivityEvents.id });

    if (cosmeticItemId) {
      await tx.insert(readerCosmeticUnlocks).values({
        userId,
        cosmeticItemId,
        sourceType: "mission_box",
        sourceReference: `${missionId}:${period.periodKey}`,
        unlockedAt: now,
      }).onConflictDoNothing();
    }
    await tx.insert(readerMissionClaims).values({
      userId,
      missionId,
      periodKey: period.periodKey,
      progressAtClaim: progress.progress,
      readerExpAwarded,
      cosmeticItemId,
      activityEventId: event.id,
      claimedAt: now,
    });

    return { alreadyClaimed: false, readerExpAwarded, cosmeticItemId, duplicateCosmeticExp };
  });

  const [dashboard, cosmetic] = await Promise.all([
    getReaderMissionDashboard(userId, now),
    reward.cosmeticItemId
      ? getDb().select({
          id: readerCosmeticItems.id,
          name: readerCosmeticItems.name,
          rarity: readerCosmeticItems.rarity,
        }).from(readerCosmeticItems).where(eq(readerCosmeticItems.id, reward.cosmeticItemId)).limit(1)
      : Promise.resolve([]),
  ]);
  return { dashboard, reward: { ...reward, cosmetic: cosmetic[0] ?? null } };
}

export async function equipReaderCosmetic(
  userId: string,
  slot: CosmeticSlot,
  cosmeticItemId: string | null,
  mutationId: string,
) {
  if (!COSMETIC_SLOTS.includes(slot)) throw new ApiError(400, "INVALID_COSMETIC_SLOT", "ช่อง Cosmetic ไม่ถูกต้อง");

  const column = {
    profile_frame: "profileFrameId",
    card_effect: "cardEffectId",
    avatar_effect: "avatarEffectId",
    reader_title: "readerTitleId",
    badge: "badgeId",
    background: "backgroundId",
  }[slot] as keyof Pick<typeof readerCosmeticLoadouts.$inferInsert,
    "profileFrameId" | "cardEffectId" | "avatarEffectId" | "readerTitleId" | "badgeId" | "backgroundId">;
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`${userId}:cosmetic-loadout`}, 0))`);
    const idempotencyKey = `cosmetic-loadout:${mutationId}`;
    const eventType = cosmeticItemId ? "cosmetic.equipped" : "cosmetic.unequipped";
    const [existingEvent] = await tx.select({
      eventType: readerActivityEvents.eventType,
      metadata: readerActivityEvents.metadata,
    }).from(readerActivityEvents).where(and(
      eq(readerActivityEvents.userId, userId),
      eq(readerActivityEvents.idempotencyKey, idempotencyKey),
    )).limit(1);
    if (existingEvent) {
      const existingCosmeticId = typeof existingEvent.metadata.cosmeticItemId === "string"
        ? existingEvent.metadata.cosmeticItemId
        : null;
      if (
        existingEvent.eventType !== eventType
        || existingEvent.metadata.slot !== slot
        || existingCosmeticId !== cosmeticItemId
      ) {
        throw new ApiError(409, "IDEMPOTENCY_KEY_REUSED", "รหัสคำขอนี้ถูกใช้กับการเปลี่ยนของแต่งรายการอื่นแล้ว");
      }
      return;
    }

    if (cosmeticItemId) {
      const [owned] = await tx.select({ slot: readerCosmeticItems.slot })
        .from(readerCosmeticUnlocks)
        .innerJoin(readerCosmeticItems, eq(readerCosmeticItems.id, readerCosmeticUnlocks.cosmeticItemId))
        .where(and(
          eq(readerCosmeticUnlocks.userId, userId),
          eq(readerCosmeticUnlocks.cosmeticItemId, cosmeticItemId),
          eq(readerCosmeticItems.isActive, true),
        )).limit(1);
      if (!owned) throw new ApiError(404, "COSMETIC_NOT_OWNED", "ยังไม่ได้ปลดล็อกของแต่งชิ้นนี้");
      if (owned.slot !== slot) throw new ApiError(400, "COSMETIC_SLOT_MISMATCH", "ของแต่งไม่ตรงกับช่องที่เลือก");
    }

    await tx.insert(readerCosmeticLoadouts).values({
      userId,
      [column]: cosmeticItemId,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: readerCosmeticLoadouts.userId,
      set: { [column]: cosmeticItemId, updatedAt: now },
    });
    await tx.insert(readerActivityEvents).values({
      userId,
      eventType,
      readerExpDelta: 0,
      idempotencyKey,
      metadata: { slot, cosmeticItemId },
      occurredAt: now,
    });
  });
  return getReaderMissionDashboard(userId, now);
}

export async function grantStarterReaderCosmetics(userId: string, now = new Date()) {
  await getDb().transaction(async (tx) => {
    await tx.insert(readerCosmeticUnlocks).values(STARTER_COSMETIC_IDS.map((cosmeticItemId) => ({
      userId,
      cosmeticItemId,
      sourceType: "starter" as const,
      sourceReference: "reader-class-profile",
      unlockedAt: now,
    }))).onConflictDoNothing();
    await tx.insert(readerCosmeticLoadouts).values({
      userId,
      profileFrameId: "frame-origin",
      readerTitleId: "title-new-reader",
      backgroundId: "background-midnight",
      updatedAt: now,
    }).onConflictDoNothing();
  });
}
