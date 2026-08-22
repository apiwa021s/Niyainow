import { describe, expect, it } from "vitest";

import { allocatePaidCoinValue, splitCreatorRevenue } from "@/lib/domain/creator-revenue";

describe("creator revenue attribution", () => {
  it("allocates the stored monetary value instead of assuming a coin exchange rate", () => {
    expect(allocatePaidCoinValue({ paidBalance: 100, paidValueMinor: 35_000, paidCoinsSpent: 3 })).toBe(1_050);
    expect(allocatePaidCoinValue({ paidBalance: 3, paidValueMinor: 1_001, paidCoinsSpent: 3 })).toBe(1_001);
  });

  it("snapshots basis-point shares and assigns rounding remainder to the platform", () => {
    expect(splitCreatorRevenue({ eligibleRevenueMinor: 255, creatorShareBasisPoints: 8_500, platformShareBasisPoints: 1_500 }))
      .toEqual({ creatorRevenueMinor: 216, platformRevenueMinor: 39 });
  });
});