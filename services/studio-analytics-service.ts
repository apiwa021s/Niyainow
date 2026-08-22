import "server-only";

import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapters,
  creatorLedgerEntries,
  creatorRevenueContracts,
  genres,
  novelGenres,
  novelRelationships,
  novelSettings,
  novelTropes,
  novels,
  readerMemberships,
  readingHistory,
  relationshipTypes,
  storySettings,
  tropes,
  writerFollows,
} from "@/db/schema";

import { requireWriterProfileForUser } from "./studio-service";

export async function getStudioEarnings(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const rows = await getDb().select({
    status: creatorLedgerEntries.status,
    amountMinor: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int`,
  }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.writerId, writer.id)).groupBy(creatorLedgerEntries.status);
  const byStatus = Object.fromEntries(rows.map((row) => [row.status, row.amountMinor]));
  return {
    pendingMinor: byStatus.pending ?? 0,
    availableMinor: byStatus.available ?? 0,
    reservedMinor: byStatus.reserved ?? 0,
    lifetimeEarningsMinor: rows.reduce((sum, row) => sum + row.amountMinor, 0),
  };
}

export async function listStudioEarningTransactions(userId: string, limit = 50) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().select({
    id: creatorLedgerEntries.id,
    type: creatorLedgerEntries.type,
    amountMinor: creatorLedgerEntries.amountMinor,
    currency: creatorLedgerEntries.currency,
    status: creatorLedgerEntries.status,
    novelId: creatorLedgerEntries.novelId,
    chapterId: creatorLedgerEntries.chapterId,
    createdAt: creatorLedgerEntries.createdAt,
  }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.writerId, writer.id))
    .orderBy(desc(creatorLedgerEntries.createdAt), desc(creatorLedgerEntries.id)).limit(Math.min(Math.max(limit, 1), 100));
}

export async function getStudioRevenueShare(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const now = new Date();
  const [contract] = await getDb().select().from(creatorRevenueContracts).where(and(
    eq(creatorRevenueContracts.writerId, writer.id),
    eq(creatorRevenueContracts.status, "ACTIVE"),
    sql`${creatorRevenueContracts.effectiveFrom} <= ${now}`,
    sql`(${creatorRevenueContracts.effectiveTo} is null or ${creatorRevenueContracts.effectiveTo} > ${now})`,
  )).orderBy(desc(creatorRevenueContracts.effectiveFrom)).limit(1);
  return contract ?? null;
}

export async function getStudioFanSummary(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const now = new Date();
  const [followers, members, returningReaders] = await Promise.all([
    getDb().select({ count: sql<number>`count(*)::int` }).from(writerFollows).where(eq(writerFollows.writerId, writer.id)),
    getDb().select({ count: sql<number>`count(*)::int` }).from(readerMemberships).where(and(
      eq(readerMemberships.writerId, writer.id),
      inArray(readerMemberships.status, ["active", "cancel_at_period_end"]),
      gt(readerMemberships.currentPeriodEnd, now),
    )),
    getDb().select({ count: sql<number>`count(distinct ${readingHistory.userId})::int` }).from(readingHistory)
      .innerJoin(novels, eq(novels.id, readingHistory.novelId))
      .where(and(eq(novels.writerId, writer.id), gt(readingHistory.readCount, 1))),
  ]);
  return {
    followerCount: followers[0]?.count ?? 0,
    memberCount: members[0]?.count ?? 0,
    returningReaders: returningReaders[0]?.count ?? 0,
  };
}

export async function getStudioFanPrivacySafeList(userId: string) {
  const summary = await getStudioFanSummary(userId);
  return { aggregateOnly: true, minimumSampleThreshold: 10, ...summary };
}

const FAN_SAMPLE_THRESHOLD = 10;

export async function getStudioFanGrowth(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
  const rows = await getDb().select({
    date: sql<string>`date(${writerFollows.createdAt})::text`,
    newFollowers: sql<number>`count(*)::int`,
  }).from(writerFollows).where(and(
    eq(writerFollows.writerId, writer.id),
    gt(writerFollows.createdAt, since),
  )).groupBy(sql`date(${writerFollows.createdAt})`).orderBy(sql`date(${writerFollows.createdAt})`);
  return { periodDays: 30, points: rows };
}

export async function getStudioFanPreferences(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const db = getDb();
  const [sample] = await db.select({ count: sql<number>`count(distinct ${readingHistory.userId})::int` })
    .from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId))
    .where(eq(novels.writerId, writer.id));
  const sampleSize = sample?.count ?? 0;
  if (sampleSize < FAN_SAMPLE_THRESHOLD) {
    return { visible: false, sampleSize, minimumSampleThreshold: FAN_SAMPLE_THRESHOLD };
  }
  const [genreRows, relationshipRows, settingRows, tropeRows, heatRows] = await Promise.all([
    db.select({ id: genres.id, slug: genres.slug, nameTh: genres.thaiName, readers: sql<number>`count(distinct ${readingHistory.userId})::int` })
      .from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId)).innerJoin(novelGenres, eq(novelGenres.novelId, novels.id)).innerJoin(genres, eq(genres.id, novelGenres.genreId))
      .where(eq(novels.writerId, writer.id)).groupBy(genres.id, genres.slug, genres.thaiName).orderBy(desc(sql`count(distinct ${readingHistory.userId})`)).limit(10),
    db.select({ id: relationshipTypes.id, slug: relationshipTypes.slug, nameTh: relationshipTypes.nameTh, readers: sql<number>`count(distinct ${readingHistory.userId})::int` })
      .from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId)).innerJoin(novelRelationships, eq(novelRelationships.novelId, novels.id)).innerJoin(relationshipTypes, eq(relationshipTypes.id, novelRelationships.relationshipTypeId))
      .where(eq(novels.writerId, writer.id)).groupBy(relationshipTypes.id, relationshipTypes.slug, relationshipTypes.nameTh).orderBy(desc(sql`count(distinct ${readingHistory.userId})`)).limit(10),
    db.select({ id: storySettings.id, slug: storySettings.slug, nameTh: storySettings.nameTh, readers: sql<number>`count(distinct ${readingHistory.userId})::int` })
      .from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId)).innerJoin(novelSettings, eq(novelSettings.novelId, novels.id)).innerJoin(storySettings, eq(storySettings.id, novelSettings.settingId))
      .where(eq(novels.writerId, writer.id)).groupBy(storySettings.id, storySettings.slug, storySettings.nameTh).orderBy(desc(sql`count(distinct ${readingHistory.userId})`)).limit(10),
    db.select({ id: tropes.id, slug: tropes.slug, nameTh: tropes.nameTh, readers: sql<number>`count(distinct ${readingHistory.userId})::int` })
      .from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId)).innerJoin(novelTropes, eq(novelTropes.novelId, novels.id)).innerJoin(tropes, eq(tropes.id, novelTropes.tropeId))
      .where(eq(novels.writerId, writer.id)).groupBy(tropes.id, tropes.slug, tropes.nameTh).orderBy(desc(sql`count(distinct ${readingHistory.userId})`)).limit(10),
    db.select({ heatLevel: novels.heatLevel, readers: sql<number>`count(distinct ${readingHistory.userId})::int` })
      .from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId))
      .where(eq(novels.writerId, writer.id)).groupBy(novels.heatLevel).orderBy(novels.heatLevel),
  ]);
  return {
    visible: true,
    sampleSize,
    minimumSampleThreshold: FAN_SAMPLE_THRESHOLD,
    genres: genreRows,
    relationships: relationshipRows,
    settings: settingRows,
    tropes: tropeRows,
    heat: heatRows,
  };
}

export async function getStudioFanSources(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const rows = await getDb().select({
    storyId: novels.id,
    storyTitle: novels.title,
    readers: sql<number>`count(distinct ${readingHistory.userId})::int`,
  }).from(readingHistory).innerJoin(novels, eq(novels.id, readingHistory.novelId))
    .where(eq(novels.writerId, writer.id)).groupBy(novels.id, novels.title)
    .orderBy(desc(sql`count(distinct ${readingHistory.userId})`)).limit(20);
  return { aggregateOnly: true, sources: rows };
}

export async function listStudioEarningsByStory(userId: string) {
  const writer = await requireWriterProfileForUser(userId);
  return getDb().select({
    storyId: novels.id,
    storyTitle: novels.title,
    amountMinor: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int`,
    transactionCount: sql<number>`count(${creatorLedgerEntries.id})::int`,
  }).from(novels).leftJoin(creatorLedgerEntries, and(
    eq(creatorLedgerEntries.novelId, novels.id),
    eq(creatorLedgerEntries.writerId, writer.id),
  )).where(eq(novels.writerId, writer.id)).groupBy(novels.id, novels.title)
    .orderBy(desc(sql`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)`));
}

export async function getStudioStoryEarnings(userId: string, storyId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const rows = await getDb().select({
    storyId: novels.id,
    storyTitle: novels.title,
    amountMinor: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int`,
    transactionCount: sql<number>`count(${creatorLedgerEntries.id})::int`,
  }).from(novels).leftJoin(creatorLedgerEntries, and(
    eq(creatorLedgerEntries.novelId, novels.id),
    eq(creatorLedgerEntries.writerId, writer.id),
  )).where(and(eq(novels.id, storyId), eq(novels.writerId, writer.id))).groupBy(novels.id, novels.title);
  return rows[0] ?? null;
}

export async function getStudioChapterEarnings(userId: string, chapterId: string) {
  const writer = await requireWriterProfileForUser(userId);
  const rows = await getDb().select({
    chapterId: chapters.id,
    chapterTitle: chapters.title,
    storyId: novels.id,
    storyTitle: novels.title,
    amountMinor: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int`,
    transactionCount: sql<number>`count(${creatorLedgerEntries.id})::int`,
  }).from(chapters).innerJoin(novels, eq(novels.id, chapters.novelId)).leftJoin(creatorLedgerEntries, and(
    eq(creatorLedgerEntries.chapterId, chapters.id),
    eq(creatorLedgerEntries.writerId, writer.id),
  )).where(and(eq(chapters.id, chapterId), eq(novels.writerId, writer.id)))
    .groupBy(chapters.id, chapters.title, novels.id, novels.title);
  return rows[0] ?? null;
}