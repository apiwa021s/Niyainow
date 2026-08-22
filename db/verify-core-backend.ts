import { loadEnvConfig } from "@next/env";
import { and, eq, sql } from "drizzle-orm";

import { closeDbConnection, getDb } from "./index";
import {
  chapterUnlocks,
  chapters,
  coinLedgerEntries,
  coinWallets,
  creatorLedgerEntries,
  creatorRevenueContracts,
  creatorRevenueEvents,
  novels,
  users,
  writerProfiles,
} from "./schema";
import { unlockChapterWithCoins } from "../services/coin-service";
import { canReadChapter } from "../services/chapter-access-service";

loadEnvConfig(process.cwd());

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`core_backend_verification_failed:${message}`);
}

async function verifyCoreBackend() {
  const db = getDb();
  const suffix = crypto.randomUUID();
  const now = new Date();
  let userId: string | undefined;
  let writerId: string | undefined;
  let novelId: string | undefined;
  let chapterId: string | undefined;
  let insufficientUserId: string | undefined;

  try {
    const [user] = await db.insert(users).values({ email: `verify-${suffix}@example.invalid`, name: "Backend Verify" }).returning({ id: users.id });
    assert(user, "user_not_created");
    userId = user.id;

    const [writer] = await db.insert(writerProfiles).values({
      userId,
      username: `verify-${suffix}`,
      displayName: "Backend Verify",
    }).returning({ id: writerProfiles.id });
    assert(writer, "writer_not_created");
    writerId = writer.id;

    await db.insert(creatorRevenueContracts).values({
      writerId,
      type: "standard",
      creatorShareBasisPoints: 8_500,
      platformShareBasisPoints: 1_500,
      effectiveFrom: new Date(now.getTime() - 60_000),
      status: "ACTIVE",
    });

    const [novel] = await db.insert(novels).values({
      writerId,
      slug: `verify-${suffix}`,
      title: "Backend Verification Story",
      synopsis: "Disposable integration fixture",
      publicationStatus: "PUBLISHED",
      publishedAt: now,
      contentRating: "ADULT",
      heatLevel: 3,
      rightsConfirmedAt: now,
      contentPolicyConfirmedAt: now,
    }).returning({ id: novels.id });
    assert(novel, "novel_not_created");
    novelId = novel.id;

    const [chapter] = await db.insert(chapters).values({
      novelId,
      chapterNumber: 6,
      sortOrder: 1,
      slug: "chapter-6",
      title: "Paid verification chapter",
      content: "Verified paid content",
      wordCount: 3,
      status: "PUBLISHED",
      accessMode: "paid",
      isFree: false,
      coinPrice: 3,
      publishedAt: now,
    }).returning({ id: chapters.id });
    assert(chapter, "chapter_not_created");
    chapterId = chapter.id;

    await db.insert(coinWallets).values({
      userId,
      balance: 12,
      paidBalance: 12,
      paidValueMinor: 1_200,
      paidValueCurrency: "THB",
      lifetimeCredited: 12,
    });

    const results = await Promise.all([
      unlockChapterWithCoins({ userId, chapterId, expectedPrice: 3, idempotencyKey: `verify-a-${suffix}` }),
      unlockChapterWithCoins({ userId, chapterId, expectedPrice: 3, idempotencyKey: `verify-b-${suffix}` }),
    ]);
    assert(results.filter((result) => result.kind === "unlocked").length === 1, "concurrent_unlock_count");
    assert(results.filter((result) => result.kind === "already-accessible").length === 1, "concurrent_already_count");

    const [wallet, purchaseCount, debitCount, revenueCount, creatorEntry] = await Promise.all([
      db.select({ balance: coinWallets.balance }).from(coinWallets).where(eq(coinWallets.userId, userId)).limit(1),
      db.select({ count: sql<number>`count(*)::int` }).from(chapterUnlocks).where(and(eq(chapterUnlocks.userId, userId), eq(chapterUnlocks.chapterId, chapterId))),
      db.select({ count: sql<number>`count(*)::int` }).from(coinLedgerEntries).where(and(eq(coinLedgerEntries.userId, userId), eq(coinLedgerEntries.chapterId, chapterId), eq(coinLedgerEntries.type, "CHAPTER_UNLOCK"))),
      db.select({ count: sql<number>`count(*)::int` }).from(creatorRevenueEvents).where(eq(creatorRevenueEvents.chapterId, chapterId)),
      db.select({ amountMinor: creatorLedgerEntries.amountMinor }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.chapterId, chapterId)).limit(1),
    ]);
    assert(wallet[0]?.balance === 9, "remaining_balance");
    assert(purchaseCount[0]?.count === 1, "purchase_count");
    assert(debitCount[0]?.count === 1, "debit_count");
    assert(revenueCount[0]?.count === 1, "revenue_event_count");
    assert(creatorEntry[0]?.amountMinor === 255, "creator_revenue_snapshot");
    const access = await canReadChapter(userId, chapterId);
    assert(access?.allowed === true && access.reason === "PURCHASED", "purchased_access");

    const [insufficientUser] = await db.insert(users).values({ email: `verify-poor-${suffix}@example.invalid`, name: "Insufficient Verify" }).returning({ id: users.id });
    assert(insufficientUser, "insufficient_user_not_created");
    insufficientUserId = insufficientUser.id;
    await db.insert(coinWallets).values({
      userId: insufficientUserId,
      balance: 1,
      paidBalance: 1,
      paidValueMinor: 100,
      paidValueCurrency: "THB",
      lifetimeCredited: 1,
    });
    const insufficient = await unlockChapterWithCoins({
      userId: insufficientUserId,
      chapterId,
      expectedPrice: 3,
      idempotencyKey: `verify-insufficient-${suffix}`,
    });
    assert(insufficient.kind === "insufficient-balance" && insufficient.balance === 1, "insufficient_result");
    const [insufficientWallet, insufficientPurchases] = await Promise.all([
      db.select({ balance: coinWallets.balance }).from(coinWallets).where(eq(coinWallets.userId, insufficientUserId)).limit(1),
      db.select({ count: sql<number>`count(*)::int` }).from(chapterUnlocks).where(and(eq(chapterUnlocks.userId, insufficientUserId), eq(chapterUnlocks.chapterId, chapterId))),
    ]);
    assert(insufficientWallet[0]?.balance === 1, "insufficient_balance_mutated");
    assert(insufficientPurchases[0]?.count === 0, "insufficient_purchase_created");

    console.info("Core backend verification passed", {
      concurrentUnlock: true,
      remainingCoins: 9,
      purchases: 1,
      debits: 1,
      revenueEvents: 1,
      creatorRevenueMinor: 255,
      purchasedAccess: true,
      insufficientBalanceUnchanged: true,
    });
  } finally {
    if (chapterId) {
      await db.delete(creatorLedgerEntries).where(eq(creatorLedgerEntries.chapterId, chapterId));
      await db.delete(creatorRevenueEvents).where(eq(creatorRevenueEvents.chapterId, chapterId));
      await db.delete(chapterUnlocks).where(eq(chapterUnlocks.chapterId, chapterId));
      await db.delete(coinLedgerEntries).where(eq(coinLedgerEntries.chapterId, chapterId));
      await db.delete(chapters).where(eq(chapters.id, chapterId));
    }
    if (userId) await db.delete(coinWallets).where(eq(coinWallets.userId, userId));
    if (insufficientUserId) {
      await db.delete(coinWallets).where(eq(coinWallets.userId, insufficientUserId));
      await db.delete(users).where(eq(users.id, insufficientUserId));
    }
    if (novelId) await db.delete(novels).where(eq(novels.id, novelId));
    if (writerId) {
      await db.delete(creatorRevenueContracts).where(eq(creatorRevenueContracts.writerId, writerId));
      await db.delete(writerProfiles).where(eq(writerProfiles.id, writerId));
    }
    if (userId) await db.delete(users).where(eq(users.id, userId));
  }
}

verifyCoreBackend()
  .catch((error: unknown) => {
    console.error("Core backend verification failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
