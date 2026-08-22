export function allocatePaidCoinValue(input: {
  paidBalance: number;
  paidValueMinor: number;
  paidCoinsSpent: number;
}) {
  if (input.paidCoinsSpent === 0) return 0;
  if (input.paidBalance <= 0 || input.paidCoinsSpent < 0 || input.paidCoinsSpent > input.paidBalance) {
    throw new RangeError("invalid_paid_coin_allocation");
  }
  if (input.paidCoinsSpent === input.paidBalance) return input.paidValueMinor;
  return Math.floor((input.paidValueMinor * input.paidCoinsSpent) / input.paidBalance);
}

export function splitCreatorRevenue(input: {
  eligibleRevenueMinor: number;
  creatorShareBasisPoints: number;
  platformShareBasisPoints: number;
}) {
  if (!Number.isSafeInteger(input.eligibleRevenueMinor) || input.eligibleRevenueMinor < 0) {
    throw new RangeError("invalid_eligible_revenue");
  }
  if (input.creatorShareBasisPoints < 0
    || input.platformShareBasisPoints < 0
    || input.creatorShareBasisPoints + input.platformShareBasisPoints !== 10_000) {
    throw new RangeError("invalid_revenue_share");
  }
  const creatorRevenueMinor = Math.floor(
    (input.eligibleRevenueMinor * input.creatorShareBasisPoints) / 10_000,
  );
  return {
    creatorRevenueMinor,
    platformRevenueMinor: input.eligibleRevenueMinor - creatorRevenueMinor,
  };
}