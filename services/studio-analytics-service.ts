import "server-only";

import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapters,
  creatorLedgerEntries,
  creatorRevenueContracts,
  novels,
  readerMemberships,
  readingHistory,
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