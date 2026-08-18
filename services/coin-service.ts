import "server-only";

import { and, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";

import { getDb } from "@/db";
import {
  chapterUnlocks,
  chapters,
  coinLedgerEntries,
  coinWallets,
  novels,
  type CoinLedgerType,
} from "@/db/schema";
import { canAccessAdmin, type AuthorizationSubject } from "@/lib/auth/permissions";
import { evaluateChapterUnlock } from "@/lib/domain/coin";

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
    .where(and(eq(chapterUnlocks.userId, userId), inArray(chapterUnlocks.chapterId, ids)));
  return rows.map((row) => row.chapterId);
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
  novelSlug: string;
  chapterNumber: number;
  expectedPrice: number;
}): Promise<UnlockChapterResult> {
  return getDb().transaction(async (tx) => {
    await tx.insert(coinWallets).values({ userId: input.userId }).onConflictDoNothing();
    const [wallet] = await tx
      .select({ balance: coinWallets.balance })
      .from(coinWallets)
      .where(eq(coinWallets.userId, input.userId))
      .for("update")
      .limit(1);
    if (!wallet) throw new Error("coin_wallet_initialization_failed");

    const now = new Date();
    const [target] = await tx
      .select({
        id: chapters.id,
        isFree: chapters.isFree,
        coinPrice: chapters.coinPrice,
      })
      .from(chapters)
      .innerJoin(novels, eq(novels.id, chapters.novelId))
      .where(
        and(
          eq(novels.slug, input.novelSlug),
          eq(chapters.chapterNumber, input.chapterNumber),
          publicNovelAndChapterCondition(now),
        ),
      )
      .for("update", { of: chapters })
      .limit(1);
    if (!target) return { kind: "not-found" };

    const [existing] = await tx
      .select({ chapterId: chapterUnlocks.chapterId })
      .from(chapterUnlocks)
      .where(and(eq(chapterUnlocks.userId, input.userId), eq(chapterUnlocks.chapterId, target.id)))
      .limit(1);
    const decision = evaluateChapterUnlock({
      isFree: target.isFree,
      alreadyUnlocked: Boolean(existing),
      balance: wallet.balance,
      price: target.coinPrice,
      expectedPrice: input.expectedPrice,
    });
    if (decision.kind === "already-accessible") {
      return { kind: decision.kind, balance: wallet.balance };
    }
    if (decision.kind === "price-changed") {
      return { kind: decision.kind, balance: wallet.balance, price: decision.price };
    }
    if (decision.kind === "insufficient-balance") return decision;

    const [updatedWallet] = await tx
      .update(coinWallets)
      .set({
        balance: decision.balanceAfter,
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
}) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0 || input.amount > 2_147_483_647) {
    throw new RangeError("invalid_coin_credit_amount");
  }
  if (!input.idempotencyKey || input.idempotencyKey.length > 255) throw new RangeError("invalid_idempotency_key");
  if (input.externalReference && input.externalReference.length > 255) throw new RangeError("invalid_external_reference");

  return getDb().transaction(async (tx) => {
    await tx.insert(coinWallets).values({ userId: input.userId }).onConflictDoNothing();
    const [wallet] = await tx
      .select({ balance: coinWallets.balance })
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
        balanceAfter: coinLedgerEntries.balanceAfter,
        externalReference: coinLedgerEntries.externalReference,
      })
      .from(coinLedgerEntries)
      .where(eq(coinLedgerEntries.idempotencyKey, input.idempotencyKey))
      .limit(1);
    if (existing) {
      const sameRequest = existing.userId === input.userId
        && existing.type === input.type
        && existing.amount === input.amount
        && existing.externalReference === (input.externalReference ?? null);
      if (!sameRequest) throw new Error("coin_credit_idempotency_conflict");
      return { credited: false, balance: existing.balanceAfter, ledgerEntryId: existing.id };
    }

    const nextBalance = wallet.balance + input.amount;
    if (!Number.isSafeInteger(nextBalance)) throw new RangeError("coin_balance_overflow");
    const now = new Date();
    const [updated] = await tx
      .update(coinWallets)
      .set({
        balance: nextBalance,
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
        balanceAfter: updated.balance,
        idempotencyKey: input.idempotencyKey,
        externalReference: input.externalReference,
      })
      .returning({ id: coinLedgerEntries.id });
    if (!ledger) throw new Error("coin_ledger_write_failed");
    return { credited: true, balance: updated.balance, ledgerEntryId: ledger.id };
  });
}
