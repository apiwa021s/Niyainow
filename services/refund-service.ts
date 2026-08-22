import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import {
  chapterUnlocks,
  coinLedgerEntries,
  coinWallets,
  creatorLedgerEntries,
  creatorRevenueEvents,
} from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";

export const chapterRefundInputSchema = z.object({
  userId: z.string().uuid(),
  chapterId: z.string().uuid(),
  idempotencyKey: z.string().trim().min(8).max(128),
}).strict();

/** Trusted financial primitive. Callers must authenticate an admin or verified provider webhook. */
export async function refundChapterPurchaseTrusted(input: z.infer<typeof chapterRefundInputSchema>) {
  return getDb().transaction(async (tx) => {
    const [purchase] = await tx.select({
      ledgerEntryId: chapterUnlocks.ledgerEntryId,
      refundedAt: chapterUnlocks.refundedAt,
      refundLedgerEntryId: chapterUnlocks.refundLedgerEntryId,
    }).from(chapterUnlocks).where(and(
      eq(chapterUnlocks.userId, input.userId),
      eq(chapterUnlocks.chapterId, input.chapterId),
    )).for("update").limit(1);
    if (!purchase) throw new ApiError(404, "PURCHASE_NOT_FOUND", "ไม่พบรายการปลดล็อกนี้");
    if (purchase.refundedAt) {
      return { refunded: false, alreadyRefunded: true, refundLedgerEntryId: purchase.refundLedgerEntryId };
    }

    const [original] = await tx.select().from(coinLedgerEntries)
      .where(eq(coinLedgerEntries.id, purchase.ledgerEntryId)).limit(1);
    if (!original || original.type !== "CHAPTER_UNLOCK") throw new Error("original_unlock_ledger_missing");

    const [wallet] = await tx.select().from(coinWallets).where(eq(coinWallets.userId, input.userId))
      .for("update").limit(1);
    if (!wallet) throw new Error("coin_wallet_missing");
    const paidRefund = -original.paidAmount;
    const bonusRefund = -original.bonusAmount;
    const promoRefund = -original.promoAmount;
    const coinRefund = -original.amount;
    const restoredPaidValue = original.eligibleRevenueMinor;
    if (paidRefund < 0 || bonusRefund < 0 || promoRefund < 0 || coinRefund <= 0) throw new Error("invalid_original_unlock_ledger");
    if (restoredPaidValue > 0 && wallet.paidValueMinor > 0 && wallet.paidValueCurrency !== original.revenueCurrency) {
      throw new Error("refund_currency_conflict");
    }
    const nextBalance = wallet.balance + coinRefund;
    const now = new Date();
    const [updatedWallet] = await tx.update(coinWallets).set({
      balance: nextBalance,
      paidBalance: wallet.paidBalance + paidRefund,
      bonusBalance: wallet.bonusBalance + bonusRefund,
      promoBalance: wallet.promoBalance + promoRefund,
      paidValueMinor: wallet.paidValueMinor + restoredPaidValue,
      paidValueCurrency: restoredPaidValue > 0 ? original.revenueCurrency : wallet.paidValueCurrency,
      lifetimeSpent: sql`${coinWallets.lifetimeSpent} - ${coinRefund}`,
      updatedAt: now,
    }).where(eq(coinWallets.userId, input.userId)).returning({ balance: coinWallets.balance });
    if (!updatedWallet) throw new Error("refund_wallet_update_failed");

    const [refundLedger] = await tx.insert(coinLedgerEntries).values({
      userId: input.userId,
      type: "REFUND",
      amount: coinRefund,
      paidAmount: paidRefund,
      bonusAmount: bonusRefund,
      promoAmount: promoRefund,
      eligibleRevenueMinor: restoredPaidValue,
      revenueCurrency: restoredPaidValue > 0 ? original.revenueCurrency : null,
      balanceAfter: updatedWallet.balance,
      chapterId: input.chapterId,
      idempotencyKey: `chapter-refund:${input.idempotencyKey}`,
      externalReference: `refund-of:${original.id}`,
    }).returning({ id: coinLedgerEntries.id });
    if (!refundLedger) throw new Error("refund_ledger_write_failed");

    await tx.update(chapterUnlocks).set({ refundedAt: now, refundLedgerEntryId: refundLedger.id })
      .where(and(eq(chapterUnlocks.userId, input.userId), eq(chapterUnlocks.chapterId, input.chapterId)));

    const [originalRevenue] = await tx.select().from(creatorRevenueEvents)
      .where(eq(creatorRevenueEvents.readerTransactionId, original.id)).limit(1);
    if (originalRevenue) {
      const [reversal] = await tx.insert(creatorRevenueEvents).values({
        writerId: originalRevenue.writerId,
        novelId: originalRevenue.novelId,
        chapterId: originalRevenue.chapterId,
        sourceType: "refund_reversal",
        coinAmount: -originalRevenue.coinAmount,
        eligibleRevenueMinor: -originalRevenue.eligibleRevenueMinor,
        creatorShareBasisPoints: originalRevenue.creatorShareBasisPoints,
        platformShareBasisPoints: originalRevenue.platformShareBasisPoints,
        creatorRevenueMinor: -originalRevenue.creatorRevenueMinor,
        platformRevenueMinor: -originalRevenue.platformRevenueMinor,
        currency: originalRevenue.currency,
        revenueRuleVersion: originalRevenue.revenueRuleVersion,
        revenueContractId: originalRevenue.revenueContractId,
        reversalOfRevenueEventId: originalRevenue.id,
        status: "reversed",
      }).returning({ id: creatorRevenueEvents.id });
      if (!reversal) throw new Error("refund_revenue_event_write_failed");
      await tx.update(creatorRevenueEvents).set({ status: "reversed" }).where(eq(creatorRevenueEvents.id, originalRevenue.id));
      await tx.update(creatorLedgerEntries).set({ status: "reversed" }).where(eq(creatorLedgerEntries.revenueEventId, originalRevenue.id));
      if (originalRevenue.creatorRevenueMinor !== 0) {
        await tx.insert(creatorLedgerEntries).values({
          writerId: originalRevenue.writerId,
          novelId: originalRevenue.novelId,
          chapterId: originalRevenue.chapterId,
          revenueEventId: reversal.id,
          type: "refund_reversal",
          amountMinor: -originalRevenue.creatorRevenueMinor,
          currency: originalRevenue.currency,
          status: "reversed",
          referenceId: `refund-reversal:${originalRevenue.id}`,
        });
      }
    }

    return { refunded: true, alreadyRefunded: false, balance: updatedWallet.balance, refundLedgerEntryId: refundLedger.id };
  });
}