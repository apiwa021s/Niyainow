import { describe, expect, it } from "vitest";

import { calculateRankingScore } from "@/lib/domain/ranking";

describe("calculateRankingScore", () => {
  it("is monotonic for positive engagement signals", () => {
    const baseline = calculateRankingScore({ views: 10, uniqueReaders: 5, chapterReads: 8, libraryAdds: 1, ratings: 1 });
    const stronger = calculateRankingScore({ views: 100, uniqueReaders: 50, chapterReads: 80, libraryAdds: 10, ratings: 10 });
    expect(stronger).toBeGreaterThan(baseline);
  });

  it("does not reward negative counters", () => {
    expect(calculateRankingScore({ views: -1, uniqueReaders: -1, chapterReads: -1, libraryAdds: -1, ratings: -1 })).toBe(0);
  });
});
