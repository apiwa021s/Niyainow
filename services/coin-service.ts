import "server-only";

import { and, desc, eq, gt, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapterUnlocks,
  chapters,
  coinLedgerEntries,
  coinWallets,
  creatorLedgerEntries,
  creatorRevenueContracts,
  creatorRevenueEvents,
  novels,
  type CoinLedgerType,
} from "@/db/schema";
import { canAccessAdmin, type AuthorizationSubject } from "@/lib/auth/permissions";
import { evaluateChapterUnlock } from "@/lib/domain/coin";
import { allocatePaidCoinValue, splitCreatorRevenue } from "@/lib/domain/creator-revenue";

const MAX_LEDGER_PAGE_SIZE = 50;

export type WalletLedgerItem = {
  id: string;
  type: CoinLedgerType;
  amount: number;
  balanceAfter: number;
  createdAt: string;
  chapterNumber: number | null;
  chapterTitle: string | null;
  novelSlug: string | null;
  novelTitle: string | null;
};

export type WalletSnapshot = {
  balance: number;
  lifetimeCredited: number;
  lifetimeSpent: number;
  entries: WalletLedgerItem[];
};

export async function getWalletBalance(userId: string) {
  const [wallet] = await getDb()
    .select({ balance: coinWallets.balance })
    .from(coinWallets)
    .where(eq(coinWallets.userId, userId))
    .limit(1);
  return wallet?.balance ?? 0;
}

function publicNovelAndChapterCondition(now: Date) {
  return and(
    eq(novels.publicationStatus, "PUBLISHED"),
    isNull(novels.deletedAt),
    lte(novels.publishedAt, now),
    eq(chapters.status, "PUBLISHED"),
    isNull(chapters.deletedAt),
    lte(chapters.publishedAt, now),
  );
}

export async function getWalletSnapshot(userId: string, requestedLimit = 20): Promise<WalletSnapshot> {
  const limit = Math.min(Math.max(Math.floor(requestedLimit) || 20, 1), MAX_LEDGER_PAGE_SIZE);
  const db = getDb();
  const [walletRows, ledgerRows] = await Promise.all([
    db
      .select({
        balance: coinWallets.balance,
        lifetimeCredited: coinWallets.lifetimeCredited,
        lifetimeSpent: coinWallets.lifetimeSpent,
      })
      .from(coinWallets)
      .where(eq(coinWallets.userId, userId))
      .limit(1),
    db
      .select({
        id: coinLedgerEntries.id,
        type: coinLedgerEntries.type,
        amount: coinLedgerEntries.amount,
        paidAmount: coinLedgerEntries.paidAmount,
        bonusAmount: coinLedgerEntries.bonusAmount,
        promoAmount: coinLedgerEntries.promoAmount,
        balanceAfter: coinLedgerEntries.balanceAfter,
        createdAt: coinLedgerEntries.createdAt,
        chapterNumber: chapters.chapterNumber,
        chapterTitle: chapters.title,
        novelSlug: novels.slug,
        novelTitle: novels.title,
      })
      .from(coinLedgerEntries)
      .leftJoin(chapters, eq(chapters.id, coinLedgerEntries.chapterId))
      .leftJoin(novels, eq(novels.id, chapters.novelId))
      .where(eq(coinLedgerEntries.userId, userId))
      .orderBy(desc(coinLedgerEntries.createdAt), desc(coinLedgerEntries.id))
      .limit(limit),
  ]);
  const wallet = walletRows[0];
  return {
    balance: wallet?.balance ?? 0,
    lifetimeCredited: wallet?.lifetimeCredited ?? 0,
    lifetimeSpent: wallet?.lifetimeSpent ?? 0,
    entries: ledgerRows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
  };
}

export async function getUnlockedChapterIds(userId: string, chapterIds: string[]): Promise<string[]> {
  const ids = [...new Set(chapterIds)].slice(0, 100);
  if (ids.length === 0) return [];
  const rows = await getDb()
    .select({ chapterId: chapterUnlocks.chapterId })
    .from(chapterUnlocks)
    .where(and(eq(chapterUnlocks.userId, userId), inArray(chapterUnlocks.chapterId, ids), isNull(chapterUnlocks.refundedAt)));
  return rows.map((row) => row.chapterId);
}

export async function listPurchasedChapters(userId: string, limit = 50) {
  return getDb().select({
    chapterId: chapterUnlocks.chapterId,
    chapterNumber: chapters.chapterNumber,
    chapterTitle: chapters.title,
    novelId: novels.id,
    novelSlug: novels.slug,
    novelTitle: novels.title,
    pricePaid: chapterUnlocks.pricePaid,
    purchasedAt: chapterUnlocks.unlockedAt,
  }).from(chapterUnlocks)
    .innerJoin(chapters, eq(chapters.id, chapterUnlocks.chapterId))
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapterUnlocks.userId, userId), isNull(chapterUnlocks.refundedAt)))
    .orderBy(desc(chapterUnlocks.unlockedAt), desc(chapterUnlocks.chapterId))
    .limit(Math.min(Math.max(limit, 1), 100));
}

/** Full paid content is never shared-cached and is selected only through entitlement. */
export async function getUnlockedPublishedChapterContent(userId: string, chapterId: string) {
  const now = new Date();
  const [row] = await getDb()
    .select({ content: chapters.content })
    .from(chapterUnlocks)
    .innerJoin(chapters, eq(chapters.id, chapterUnlocks.chapterId))
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(
      and(
        eq(chapterUnlocks.userId, userId),
        eq(chapterUnlocks.chapterId, chapterId),
        isNull(chapterUnlocks.refundedAt),
        publicNovelAndChapterCondition(now),
      ),
    )
    .limit(1);
  return row?.content ?? null;
}

export async function getStaffPublishedChapterContent(
  subject: AuthorizationSubject,
  chapterId: string,
) {
  if (!canAccessAdmin(subject)) return null;
  const now = new Date();
  const [row] = await getDb()
    .select({ content: chapters.content })
    .from(chapters)
    .innerJoin(novels, eq(novels.id, chapters.novelId))
    .where(and(eq(chapters.id, chapterId), publicNovelAndChapterCondition(now)))
    .limit(1);
  return row?.content ?? null;
}

export type UnlockChapterResult =
  | { kind: "not-found" }
  | { kind: "not-purchasable" }
  | { kind: "already-accessible"; balance: number }
  | { kind: "price-changed"; balance: number; price: number }
  | { kind: "insufficient-balance"; balance: number; price: number }
  | { kind: "unlocked"; balance: number; price: number };

/**
 * Serializes spending per wallet, rechecks the chapter price inside the same
 * transaction, and records the debit and entitlement atomically.
 */
export async function unlockChapterWithCoins(input: {
  userId: string;
  novelSlug?: string;
  chapterNumber?: number;
  chapterId?: string;
  expectedPrice: number;
  idempotencyKey?: string;
}): Promise<UnlockChapterResult> {
  if (!input.chapterId && (!input.novelSlug || input.chapterNumber === undefined)) {
    throw new RangeError("chapter_reference_required");
  }
  if (input.idempotencyKey && (input.idempotencyKey.length < 8 || input.idempotencyKey.length > 128)) {
    throw new RangeError("invalid_idempotency_key");
  }
  return getDb().transaction(async (tx) => {
    await tx.insert(coinWallets).values({ userId: input.userId }).onConflictDoNothing();
    const [wallet] = await tx
      .select({
        balance: coinWallets.balance,
        paidBalance: coinWallets.paidBalance,
        bonusBalance: coinWallets.bonusBalance,
        promoBalance: coinWallets.promoBalance,
        paidValueMinor: coinWallets.paidValueMinor,
        paidValueCurrency: coinWallets.paidValueCurrency,
      })
      .from(coinWallets)
      .where(eq(coinWallets.userId, input.userId))
      .for("update")
      .limit(1);
    if (!wallet) throw new Error("coin_wallet_initialization_failed");

    const now = new Date();
    const [target] = await tx
      .select({
        id: chapters.id,
        novelId: chapters.novelId,
        writerId: novels.writerId,
        isFree: chapters.isFree,
        accessMode: chapters.accessMode,
        coinPrice: chapters.coinPrice,
        publicAvailableAt: chapters.publicAvailableAt,
        publicAccessModeAfterEarlyAccess: chapters.publicAccessModeAfterEarlyAccess,
        publicCoinPrice: chapters.publicCoinPrice,
      })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(
        and(
          input.chapterId
            ? eq(chapters.id, input.chapterId)
            : and(eq(novels.slug, input.novelSlug!), eq(chapters.chapterNumber, input.chapterNumber!)),
          publicNovelAndChapterCondition(now),
        ),
      )
      .for("update", { of: chapters })
      .limit(1);
    if (!target) return { kind: "not-found" };

    const isEarlyAccessPublicPaid = target.accessMode === "early_access"
      && target.publicAvailableAt !== null
      && target.publicAvailableAt <= now
      && target.publicAccessModeAfterEarlyAccess === "paid"
      && target.publicCoinPrice !== null;
    const purchasePrice = target.accessMode === "paid"
      ? target.coinPrice
      : isEarlyAccessPublicPaid
        ? target.publicCoinPrice!
        : null;
    if (purchasePrice === null) {
      if (target.accessMode === "free") return { kind: "already-accessible", balance: wallet.balance };
      return { kind: "not-purchasable" };
    }

    const [existing] = await tx
      .select({ chapterId: chapterUnlocks.chapterId, refundedAt: chapterUnlocks.refundedAt })
      .from(chapterUnlocks)
      .where(and(eq(chapterUnlocks.userId, input.userId), eq(chapterUnlocks.chapterId, target.id)))
      .limit(1);
    if (existing?.refundedAt) return { kind: "not-purchasable" };
    const decision = evaluateChapterUnlock({
      isFree: false,
      alreadyUnlocked: Boolean(existing),
      balance: wallet.balance,
      price: purchasePrice,
      expectedPrice: input.expectedPrice,
    });
    if (decision.kind === "already-accessible") {
      return { kind: decision.kind, balance: wallet.balance };
    }
    if (decision.kind === "price-changed") {
      return { kind: decision.kind, balance: wallet.balance, price: decision.price };
    }
    if (decision.kind === "insufficient-balance") return decision;

    const promoSpent = Math.min(wallet.promoBalance, decision.price);
    const afterPromo = decision.price - promoSpent;
    const bonusSpent = Math.min(wallet.bonusBalance, afterPromo);
    const paidSpent = afterPromo - bonusSpent;
    const eligibleRevenueMinor = allocatePaidCoinValue({
      paidBalance: wallet.paidBalance,
      paidValueMinor: wallet.paidValueMinor,
      paidCoinsSpent: paidSpent,
    });
    const remainingPaidValueMinor = wallet.paidValueMinor - eligibleRevenueMinor;

    const [contract] = target.writerId
      ? await tx
          .select({
            id: creatorRevenueContracts.id,
            creatorShareBasisPoints: creatorRevenueContracts.creatorShareBasisPoints,
            platformShareBasisPoints: creatorRevenueContracts.platformShareBasisPoints,
            effectiveFrom: creatorRevenueContracts.effectiveFrom,
          })
          .from(creatorRevenueContracts)
          .where(and(
            eq(creatorRevenueContracts.writerId, target.writerId),
            eq(creatorRevenueContracts.status, "ACTIVE"),
            lte(creatorRevenueContracts.effectiveFrom, now),
            or(isNull(creatorRevenueContracts.effectiveTo), gt(creatorRevenueContracts.effectiveTo, now)),
          ))
          .orderBy(desc(creatorRevenueContracts.effectiveFrom))
          .limit(1)
      : [];
    if (target.writerId && !contract) throw new Error("creator_revenue_contract_missing");

    const [updatedWallet] = await tx
      .update(coinWallets)
      .set({
        balance: decision.balanceAfter,
        paidBalance: wallet.paidBalance - paidSpent,
        bonusBalance: wallet.bonusBalance - bonusSpent,
        promoBalance: wallet.promoBalance - promoSpent,
        paidValueMinor: remainingPaidValueMinor,
        paidValueCurrency: wallet.paidBalance - paidSpent > 0 ? wallet.paidValueCurrency : null,
        lifetimeSpent: sql`${coinWallets.lifetimeSpent} + ${decision.price}`,
        updatedAt: now,
      })
      .where(eq(coinWallets.userId, input.userId))
      .returning({ balance: coinWallets.balance });
    if (!updatedWallet) throw new Error("coin_wallet_debit_failed");

    const [ledger] = await tx
      .insert(coinLedgerEntries)
      .values({
        userId: input.userId,
        type: "CHAPTER_UNLOCK",
        amount: -decision.price,
        paidAmount: -paidSpent,
        bonusAmount: -bonusSpent,
        promoAmount: -promoSpent,
        eligibleRevenueMinor,
        revenueCurrency: eligibleRevenueMinor > 0 ? wallet.paidValueCurrency : null,
        balanceAfter: updatedWallet.balance,
        chapterId: target.id,
        idempotencyKey: `chapter-unlock:${input.userId}:${target.id}`,
      })
      .returning({ id: coinLedgerEntries.id });
    if (!ledger) throw new Error("coin_ledger_write_failed");

    await tx.insert(chapterUnlocks).values({
      userId: input.userId,
      chapterId: target.id,
      ledgerEntryId: ledger.id,
      pricePaid: decision.price,
      unlockedAt: now,
    });

    if (target.writerId && contract) {
      const currency = wallet.paidValueCurrency ?? "THB";
      const split = splitCreatorRevenue({
        eligibleRevenueMinor,
        creatorShareBasisPoints: contract.creatorShareBasisPoints,
        platformShareBasisPoints: contract.platformShareBasisPoints,
      });
      const [revenueEvent] = await tx
        .insert(creatorRevenueEvents)
        .values({
          writerId: target.writerId,
          novelId: target.novelId,
          chapterId: target.id,
          readerTransactionId: ledger.id,
          sourceType: "chapter_unlock",
          coinAmount: decision.price,
          eligibleRevenueMinor,
          creatorShareBasisPoints: contract.creatorShareBasisPoints,
          platformShareBasisPoints: contract.platformShareBasisPoints,
          creatorRevenueMinor: split.creatorRevenueMinor,
          platformRevenueMinor: split.platformRevenueMinor,
          currency,
          revenueRuleVersion: `contract:${contract.id}:${contract.effectiveFrom.toISOString()}`,
          revenueContractId: contract.id,
          status: "pending",
        })
        .returning({ id: creatorRevenueEvents.id });
      if (!revenueEvent) throw new Error("creator_revenue_event_write_failed");

      if (split.creatorRevenueMinor > 0) {
        await tx.insert(creatorLedgerEntries).values({
          writerId: target.writerId,
          novelId: target.novelId,
          chapterId: target.id,
          revenueEventId: revenueEvent.id,
          type: "chapter_unlock",
          amountMinor: split.creatorRevenueMinor,
          currency,
          status: "pending",
          referenceId: `chapter-unlock:${ledger.id}`,
        });
      }
    }
    return { kind: "unlocked", balance: updatedWallet.balance, price: decision.price };
  });
}

/** Trusted webhook/admin primitive. Callers must authenticate before invoking it. */
export async function creditCoins(input: {
  userId: string;
  amount: number;
  type: Exclude<CoinLedgerType, "CHAPTER_UNLOCK">;
  idempotencyKey: string;
  externalReference?: string;
  bucket?: "PAID" | "BONUS" | "PROMO";
  paidValueMinor?: number;
  currency?: string;
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 2_147_483_647) {
    throw new RangeError("invalid_coin_credit_amount");
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 255) throw new RangeError("invalid_idempotency_key");
  if (input.externalReference && input.externalReference.length > 255) throw new RangeError("invalid_external_reference");
  if (input.paidValueMinor !== undefined && (!Number.isSafeInteger(input.paidValueMinor) || input.paidValueMinor < 0)) {
    throw new RangeError("invalid_paid_value");
  }
  if (input.currency && !/^[A-Z]{3}$/u.test(input.currency)) throw new RangeError("invalid_currency");

  return getDb().transaction(async (tx) => {
    await tx.insert(coinWallets).values({ userId: input.userId }).onConflictDoNothing();
    const [wallet] = await tx
      .select({
        balance: coinWallets.balance,
        paidBalance: coinWallets.paidBalance,
        bonusBalance: coinWallets.bonusBalance,
        promoBalance: coinWallets.promoBalance,
        paidValueMinor: coinWallets.paidValueMinor,
        paidValueCurrency: coinWallets.paidValueCurrency,
      })
      .from(coinWallets)
      .where(eq(coinWallets.userId, input.userId))
      .for("update")
      .limit(1);
    if (!wallet) throw new Error("coin_wallet_initialization_failed");

    const [existing] = await tx
      .select({
        id: coinLedgerEntries.id,
        userId: coinLedgerEntries.userId,
        type: coinLedgerEntries.type,
        amount: coinLedgerEntries.amount,
        paidAmount: coinLedgerEntries.paidAmount,
        bonusAmount: coinLedgerEntries.bonusAmount,
        promoAmount: coinLedgerEntries.promoAmount,
        eligibleRevenueMinor: coinLedgerEntries.eligibleRevenueMinor,
        revenueCurrency: coinLedgerEntries.revenueCurrency,
        balanceAfter: coinLedgerEntries.balanceAfter,
        externalReference: coinLedgerEntries.externalReference,
      })
      .from(coinLedgerEntries)
      .where(eq(coinLedgerEntries.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      const bucket = input.bucket ?? (input.type === "PROMOTION" ? "PROMO" : "PAID");
      const sameRequest = existing.userId === input.userId
        && existing.type === input.type
        && existing.amount === input.amount
        && existing.paidAmount === (bucket === "PAID" ? input.amount : 0)
        && existing.bonusAmount === (bucket === "BONUS" ? input.amount : 0)
        && existing.promoAmount === (bucket === "PROMO" ? input.amount : 0)
        && existing.eligibleRevenueMinor === (bucket === "PAID" ? (input.paidValueMinor ?? 0) : 0)
        && existing.revenueCurrency === ((input.paidValueMinor ?? 0) > 0 ? (input.currency ?? null) : null)
        && existing.externalReference === (input.externalReference ?? null);
      if (!sameRequest) throw new Error("coin_credit_idempotency_conflict");
      return { credited: false, balance: existing.balanceAfter, ledgerEntryId: existing.id };
    }

    const nextBalance = wallet.balance + input.amount;
    if (!Number.isSafeInteger(nextBalance)) throw new RangeError("coin_balance_overflow");
    const now = new Date();
    const bucket = input.bucket ?? (input.type === "PROMOTION" ? "PROMO" : "PAID");
    const paidValueMinor = input.paidValueMinor ?? 0;
    if (bucket !== "PAID" && paidValueMinor !== 0) throw new RangeError("non_paid_coin_value");
    if (paidValueMinor > 0 && !input.currency) throw new RangeError("paid_value_currency_required");
    if (bucket === "PAID" && wallet.paidBalance > 0 && paidValueMinor > 0
      && wallet.paidValueCurrency !== input.currency) {
      throw new Error("paid_value_currency_conflict");
    }
    const [updated] = await tx
      .update(coinWallets)
      .set({
        balance: nextBalance,
        paidBalance: bucket === "PAID" ? wallet.paidBalance + input.amount : wallet.paidBalance,
        bonusBalance: bucket === "BONUS" ? wallet.bonusBalance + input.amount : wallet.bonusBalance,
        promoBalance: bucket === "PROMO" ? wallet.promoBalance + input.amount : wallet.promoBalance,
        paidValueMinor: bucket === "PAID" ? wallet.paidValueMinor + paidValueMinor : wallet.paidValueMinor,
        paidValueCurrency: bucket === "PAID" && paidValueMinor > 0 ? input.currency : wallet.paidValueCurrency,
        lifetimeCredited: sql`${coinWallets.lifetimeCredited} + ${input.amount}`,
        updatedAt: now,
      })
      .where(eq(coinWallets.userId, input.userId))
      .returning({ balance: coinWallets.balance });
    if (!updated) throw new Error("coin_wallet_credit_failed");

    const [ledger] = await tx
      .insert(coinLedgerEntries)
      .values({
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        paidAmount: bucket === "PAID" ? input.amount : 0,
        bonusAmount: bucket === "BONUS" ? input.amount : 0,
        promoAmount: bucket === "PROMO" ? input.amount : 0,
        eligibleRevenueMinor: bucket === "PAID" ? paidValueMinor : 0,
        revenueCurrency: paidValueMinor > 0 ? input.currency : null,
        balanceAfter: updated.balance,
        idempotencyKey: input.idempotencyKey,
        externalReference: input.externalReference,
      })
      .returning({ id: coinLedgerEntries.id });
    if (!ledger) throw new Error("coin_ledger_write_failed");
    return { credited: true, balance: updated.balance, ledgerEntryId: ledger.id };
  });
}
