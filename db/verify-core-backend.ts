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
  domainOutboxEvents,
  notifications,
  novelFollows,
  novels,
  readerMemberships,
  users,
  writerMembershipPlans,
  writerProfiles,
} from "./schema";
import { unlockChapterWithCoins } from "../services/coin-service";
import { canReadChapter } from "../services/chapter-access-service";
import { refundChapterPurchaseTrusted } from "../services/refund-service";
import { publishDueChapters } from "../services/scheduled-publishing-service";
import { createWriterChapter, createWriterStory, getWriterStory, publishWriterChapter } from "../services/studio-service";
import { processNotificationOutbox } from "../services/outbox-service";
import { applyMembershipProviderEvent } from "../services/membership-service";

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
  let otherUserId: string | undefined;
  let otherWriterId: string | undefined;
  let scheduledChapterId: string | undefined;
  let memberChapterId: string | undefined;
  let membershipPlanId: string | undefined;
  let studioStoryId: string | undefined;
  let studioChapterId: string | undefined;

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

    const studioStory = await createWriterStory(userId, {
      title: `Verification Dark Romance ${suffix}`,
      tagline: "Disposable Studio fixture",
      synopsis: "Create Story acceptance scenario",
      coverKey: null,
      primaryGenreId: "dark_romance",
      secondaryGenreIds: ["romance"],
      relationshipIds: ["mm"],
      settingIds: ["omegaverse"],
      tropeIds: ["possessive", "slow_burn", "protective_lead"],
      heatLevel: 4,
      contentWarningIds: ["violence"],
      storyType: "serial",
      storyStatus: "ongoing",
      originType: "original",
      originalTitle: null,
      rightsHolder: null,
      rightsNote: null,
      rightsDocumentReference: null,
      rightsConfirmed: true,
      contentPolicyConfirmed: true,
    });
    studioStoryId = studioStory.id;
    assert(studioStory.publicationStatus === "DRAFT" && studioStory.heatLevel === 4, "studio_story_create");
    const studioChapter = await createWriterChapter(userId, studioStoryId, {
      chapterNumber: 1,
      title: "Free acceptance chapter",
      content: "Published free content",
      accessMode: "free",
      coinPrice: 0,
      inheritStoryHeatLevel: true,
      heatLevel: null,
      inheritStoryWarnings: true,
      contentWarningIds: [],
      memberAvailableAt: null,
      publicAvailableAt: null,
      publicAccessModeAfterEarlyAccess: null,
      publicCoinPrice: null,
    });
    studioChapterId = studioChapter.id;
    await db.update(novels).set({ publicationStatus: "PUBLISHED", publishedAt: now }).where(eq(novels.id, studioStoryId));
    await publishWriterChapter(userId, studioChapterId);
    const freeAccess = await canReadChapter(null, studioChapterId, new Date());
    assert(freeAccess?.allowed === true && freeAccess.reason === "FREE", "free_chapter_access");
    const directPublishOutbox = await processNotificationOutbox(new Date());
    assert(directPublishOutbox.processed === 1 && directPublishOutbox.failed === 0, "direct_publish_outbox");

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

    const [otherUser] = await db.insert(users).values({ email: `verify-other-${suffix}@example.invalid`, name: "Other Writer" }).returning({ id: users.id });
    assert(otherUser, "other_user_not_created");
    otherUserId = otherUser.id;
    const [otherWriter] = await db.insert(writerProfiles).values({ userId: otherUserId, username: `verify-other-${suffix}`, displayName: "Other Writer" }).returning({ id: writerProfiles.id });
    assert(otherWriter, "other_writer_not_created");
    otherWriterId = otherWriter.id;
    await db.update(users).set({ hideStoryTitleInNotification: false }).where(eq(users.id, otherUserId));
    await db.insert(novelFollows).values([
      { userId: insufficientUserId, novelId, notificationsEnabled: true },
      { userId: otherUserId, novelId, notificationsEnabled: true },
    ]);
    let ownershipDenied = false;
    try {
      await getWriterStory(otherUserId, novelId);
    } catch (error) {
      ownershipDenied = typeof error === "object" && error !== null && "code" in error && error.code === "STORY_NOT_FOUND";
    }
    assert(ownershipDenied, "cross_writer_ownership_not_denied");

    const scheduledAt = new Date(now.getTime() + 60_000);
    const [scheduledChapter] = await db.insert(chapters).values({
      novelId,
      chapterNumber: 20,
      sortOrder: 2,
      slug: "chapter-20",
      title: "Scheduled verification chapter",
      content: "Scheduled content",
      wordCount: 2,
      status: "SCHEDULED",
      accessMode: "free",
      isFree: true,
      coinPrice: 0,
      scheduledFor: scheduledAt,
    }).returning({ id: chapters.id });
    assert(scheduledChapter, "scheduled_chapter_not_created");
    scheduledChapterId = scheduledChapter.id;
    const beforeSchedule = await publishDueChapters(new Date(scheduledAt.getTime() - 1));
    const firstSchedule = await publishDueChapters(new Date(scheduledAt.getTime() + 1));
    const repeatedSchedule = await publishDueChapters(new Date(scheduledAt.getTime() + 2));
    const scheduledAccess = await canReadChapter(null, scheduledChapterId, new Date(scheduledAt.getTime() + 2));
    assert(beforeSchedule.length === 0, "scheduled_published_too_early");
    assert(firstSchedule.length === 1 && firstSchedule[0]?.id === scheduledChapterId, "scheduled_publish_transition");
    assert(repeatedSchedule.length === 0, "scheduled_publish_repeated");
    assert(scheduledAccess?.allowed === true && scheduledAccess.reason === "FREE", "scheduled_access_after_publish");
    const outboxRun = await processNotificationOutbox(new Date(scheduledAt.getTime() + 3));
    const outboxRetry = await processNotificationOutbox(new Date(scheduledAt.getTime() + 4));
    const deliveredNotifications = await db.select({
      userId: notifications.userId,
      title: notifications.title,
    }).from(notifications).where(eq(notifications.entityId, scheduledChapterId));
    assert(outboxRun.processed === 1 && outboxRun.failed === 0, "outbox_delivery");
    assert(outboxRetry.claimed === 0, "outbox_retry_claimed_processed_event");
    assert(deliveredNotifications.length === 2, "notification_dedupe_count");
    assert(deliveredNotifications.find((item) => item.userId === insufficientUserId)?.title === "เรื่องที่คุณติดตามมีตอนใหม่", "notification_privacy_hidden");
    assert(deliveredNotifications.find((item) => item.userId === otherUserId)?.title === "Backend Verification Story มีตอนใหม่", "notification_privacy_visible");

    const [membershipPlan] = await db.insert(writerMembershipPlans).values({
      writerId,
      name: "Verification Membership",
      priceMinor: 9_900,
      currency: "THB",
      status: "ACTIVE",
    }).returning({ id: writerMembershipPlans.id });
    assert(membershipPlan, "membership_plan_not_created");
    membershipPlanId = membershipPlan.id;
    const [memberChapter] = await db.insert(chapters).values({
      novelId,
      chapterNumber: 21,
      sortOrder: 3,
      slug: "chapter-21",
      title: "Members-only verification chapter",
      content: "Members only content",
      wordCount: 3,
      status: "PUBLISHED",
      accessMode: "members_only",
      isFree: false,
      coinPrice: 0,
      publishedAt: now,
    }).returning({ id: chapters.id });
    assert(memberChapter, "member_chapter_not_created");
    memberChapterId = memberChapter.id;
    const membershipPeriodEnd = new Date(now.getTime() + 60_000);
    await applyMembershipProviderEvent({
      provider: "verified-test-provider",
      providerSubscriptionId: `verify-membership-${suffix}`,
      readerId: insufficientUserId,
      writerId,
      membershipPlanId,
      status: "active",
      currentPeriodStart: new Date(now.getTime() - 60_000),
      currentPeriodEnd: membershipPeriodEnd,
      cancelAtPeriodEnd: false,
    });
    const activeMemberAccess = await canReadChapter(insufficientUserId, memberChapterId, now);
    await applyMembershipProviderEvent({
      provider: "verified-test-provider",
      providerSubscriptionId: `verify-membership-${suffix}`,
      readerId: insufficientUserId,
      writerId,
      membershipPlanId,
      status: "cancel_at_period_end",
      currentPeriodStart: new Date(now.getTime() - 60_000),
      currentPeriodEnd: membershipPeriodEnd,
      cancelAtPeriodEnd: true,
    });
    const cancellingMemberAccess = await canReadChapter(insufficientUserId, memberChapterId, new Date(membershipPeriodEnd.getTime() - 1));
    const expiredMemberAccess = await canReadChapter(insufficientUserId, memberChapterId, membershipPeriodEnd);
    assert(activeMemberAccess?.allowed === true && activeMemberAccess.reason === "MEMBER", "active_membership_access");
    assert(cancellingMemberAccess?.allowed === true && cancellingMemberAccess.reason === "MEMBER", "cancel_at_period_end_access");
    assert(expiredMemberAccess?.allowed === false && expiredMemberAccess.reason === "MEMBERSHIP_REQUIRED", "expired_membership_access");

    const refund = await refundChapterPurchaseTrusted({
      userId,
      chapterId,
      idempotencyKey: `verify-refund-${suffix}`,
    });
    assert(refund.refunded && refund.balance === 12, "refund_result");
    const refundRetry = await refundChapterPurchaseTrusted({
      userId,
      chapterId,
      idempotencyKey: `verify-refund-${suffix}`,
    });
    assert(!refundRetry.refunded && refundRetry.alreadyRefunded, "refund_idempotency");
    const [refundedAccess, refundLedgers, reversalEvents, creatorNet] = await Promise.all([
      canReadChapter(userId, chapterId),
      db.select({ count: sql<number>`count(*)::int` }).from(coinLedgerEntries).where(and(eq(coinLedgerEntries.userId, userId), eq(coinLedgerEntries.chapterId, chapterId), eq(coinLedgerEntries.type, "REFUND"))),
      db.select({ count: sql<number>`count(*)::int` }).from(creatorRevenueEvents).where(and(eq(creatorRevenueEvents.chapterId, chapterId), eq(creatorRevenueEvents.sourceType, "refund_reversal"))),
      db.select({ amount: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int` }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.chapterId, chapterId)),
    ]);
    assert(refundedAccess?.allowed === false && refundedAccess.reason === "PAID_REQUIRED", "refund_access_not_revoked");
    assert(refundLedgers[0]?.count === 1, "refund_ledger_count");
    assert(reversalEvents[0]?.count === 1, "refund_reversal_count");
    assert(creatorNet[0]?.amount === 0, "refund_creator_ledger_net");

    console.info("Core backend verification passed", {
      concurrentUnlock: true,
      remainingCoins: 9,
      purchases: 1,
      debits: 1,
      revenueEvents: 1,
      creatorRevenueMinor: 255,
      purchasedAccess: true,
      insufficientBalanceUnchanged: true,
      refundIdempotent: true,
      refundAccessRevoked: true,
      creatorRevenueNetAfterRefund: 0,
      crossWriterOwnershipDenied: true,
      scheduledPublishExactlyOnce: true,
      notificationOutboxExactlyOnce: true,
      notificationPrivacy: true,
      membershipPeriodBoundary: true,
      studioStoryCreate: true,
      freeChapterPublishAccess: true,
    });
  } finally {
    if (studioChapterId) {
      await db.delete(domainOutboxEvents).where(eq(domainOutboxEvents.aggregateId, studioChapterId));
      await db.delete(chapters).where(eq(chapters.id, studioChapterId));
    }
    if (studioStoryId) await db.delete(novels).where(eq(novels.id, studioStoryId));
    if (chapterId) {
      await db.delete(creatorLedgerEntries).where(eq(creatorLedgerEntries.chapterId, chapterId));
      await db.delete(creatorRevenueEvents).where(eq(creatorRevenueEvents.chapterId, chapterId));
      await db.delete(chapterUnlocks).where(eq(chapterUnlocks.chapterId, chapterId));
      await db.delete(coinLedgerEntries).where(eq(coinLedgerEntries.chapterId, chapterId));
      await db.delete(chapters).where(eq(chapters.id, chapterId));
    }
    if (scheduledChapterId) {
      await db.delete(domainOutboxEvents).where(eq(domainOutboxEvents.aggregateId, scheduledChapterId));
      await db.delete(notifications).where(eq(notifications.entityId, scheduledChapterId));
      await db.delete(chapters).where(eq(chapters.id, scheduledChapterId));
    }
    if (memberChapterId) await db.delete(chapters).where(eq(chapters.id, memberChapterId));
    if (membershipPlanId) {
      await db.delete(readerMemberships).where(eq(readerMemberships.membershipPlanId, membershipPlanId));
      await db.delete(writerMembershipPlans).where(eq(writerMembershipPlans.id, membershipPlanId));
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
    if (otherWriterId) await db.delete(writerProfiles).where(eq(writerProfiles.id, otherWriterId));
    if (otherUserId) await db.delete(users).where(eq(users.id, otherUserId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  }
}

verifyCoreBackend()
  .catch((error: unknown) => {
    console.error("Core backend verification failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
