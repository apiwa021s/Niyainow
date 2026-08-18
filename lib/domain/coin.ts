export type UnlockDecision =
  | { kind: "already-accessible" }
  | { kind: "price-changed"; price: number }
  | { kind: "insufficient-balance"; balance: number; price: number }
  | { kind: "charge"; price: number; balanceAfter: number };

export function evaluateChapterUnlock(input: {
  isFree: boolean;
  alreadyUnlocked: boolean;
  balance: number;
  price: number;
  expectedPrice: number;
}): UnlockDecision {
  if (input.isFree || input.alreadyUnlocked) return { kind: "already-accessible" };
  if (input.price !== input.expectedPrice) return { kind: "price-changed", price: input.price };
  if (input.balance < input.price) {
    return { kind: "insufficient-balance", balance: input.balance, price: input.price };
  }
  return { kind: "charge", price: input.price, balanceAfter: input.balance - input.price };
}
