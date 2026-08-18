import { describe, expect, it } from "vitest";

import { evaluateChapterUnlock } from "@/lib/domain/coin";

describe("evaluateChapterUnlock", () => {
  it("does not charge free or already unlocked chapters", () => {
    expect(evaluateChapterUnlock({ isFree: true, alreadyUnlocked: false, balance: 0, price: 0, expectedPrice: 0 }))
      .toEqual({ kind: "already-accessible" });
    expect(evaluateChapterUnlock({ isFree: false, alreadyUnlocked: true, balance: 0, price: 10, expectedPrice: 10 }))
      .toEqual({ kind: "already-accessible" });
  });

  it("requires a fresh confirmation when the price changes", () => {
    expect(evaluateChapterUnlock({ isFree: false, alreadyUnlocked: false, balance: 20, price: 12, expectedPrice: 10 }))
      .toEqual({ kind: "price-changed", price: 12 });
  });

  it("rejects insufficient balances and calculates an exact debit", () => {
    expect(evaluateChapterUnlock({ isFree: false, alreadyUnlocked: false, balance: 9, price: 10, expectedPrice: 10 }))
      .toEqual({ kind: "insufficient-balance", balance: 9, price: 10 });
    expect(evaluateChapterUnlock({ isFree: false, alreadyUnlocked: false, balance: 20, price: 10, expectedPrice: 10 }))
      .toEqual({ kind: "charge", price: 10, balanceAfter: 10 });
  });
});
