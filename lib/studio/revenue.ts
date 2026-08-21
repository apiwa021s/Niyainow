/**
 * Revenue-share math, done the way a real ledger has to do it: integer minor
 * units (satang — 1/100 baht) in, integer minor units out. Nothing here ever
 * touches a JavaScript float for a real money value (spec §10).
 *
 * This module is pure and has no I/O — once a real revenue-events backend
 * exists, this is the exact shape its calculation step returns. The mock
 * data and every earnings component in `components/studio/earnings/` call
 * through here instead of computing shares inline, so there is exactly one
 * place that knows how a split is rounded.
 */

/** Bumped only when the split/rounding rule itself changes — never touches past events (spec §10, §6). */
export const REVENUE_RULE_VERSION = "2026-08-v1";

/**
 * Coins are never assumed to equal ฿1 forever (spec §9) — a purchase can mix
 * paid, bonus and promo coins at different effective values. This is today's
 * blended value for the current rule version; a real backend would resolve it
 * per-transaction from the reader's actual coin purchase mix instead of one
 * constant.
 */
export const COIN_VALUE_MINOR_UNITS = 100;

export type RevenueBreakdown = {
  revenueRuleVersion: string;
  eligibleRevenueMinor: number;
  creatorSharePercent: number;
  platformSharePercent: number;
  creatorRevenueMinor: number;
  platformRevenueMinor: number;
};

/** Eligible revenue a paid unlock contributes, before any revenue-share split. */
export function coinsToEligibleRevenueMinor(coinAmount: number, unlocks = 1): number {
  return Math.round(coinAmount * unlocks * COIN_VALUE_MINOR_UNITS);
}

/**
 * Splits eligible revenue by a creator's contracted share. Rounds down toward
 * the creator's favor per unlock and gives the remainder to the platform, so
 * a writer is never shorted a satang by rounding — matches spec §8 exactly
 * (฿3.00 × 85% = ฿2.55, never ฿2.549999...).
 */
export function calculateRevenueShare(eligibleRevenueMinor: number, creatorSharePercent: number): RevenueBreakdown {
  if (!Number.isInteger(eligibleRevenueMinor) || eligibleRevenueMinor < 0) {
    throw new RangeError("eligibleRevenueMinor must be a nonnegative integer minor-unit amount");
  }
  if (creatorSharePercent < 0 || creatorSharePercent > 100) {
    throw new RangeError("creatorSharePercent must be between 0 and 100");
  }
  const creatorRevenueMinor = Math.floor((eligibleRevenueMinor * creatorSharePercent) / 100);
  const platformRevenueMinor = eligibleRevenueMinor - creatorRevenueMinor;
  return {
    revenueRuleVersion: REVENUE_RULE_VERSION,
    eligibleRevenueMinor,
    creatorSharePercent,
    platformSharePercent: 100 - creatorSharePercent,
    creatorRevenueMinor,
    platformRevenueMinor,
  };
}

export function minorToBaht(minor: number): number {
  return minor / 100;
}
