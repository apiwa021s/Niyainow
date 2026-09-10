import { describe, expect, it } from "vitest";

import { calculateChapterRisk } from "@/lib/security/abuse-detection";

const limits = { fiveMinutes: 15, oneHour: 60, sequential: 10 };
const now = Date.parse("2026-09-11T12:00:00.000Z");

describe("calculateChapterRisk", () => {
  it("does not block a fast legitimate reader on frequency alone", () => {
    const samples = Array.from({ length: 18 }, (_, index) => ({
      timestamp: now - index * 10_000,
      novelId: `novel-${index % 2}`,
      chapterNumber: index * 3,
    }));
    const result = calculateChapterRisk({
      authenticated: false,
      samples,
      request: { nonBrowser: false, knownAutomation: false },
      now,
      limits,
    });
    expect(result.allowed).toBe(true);
    expect(result.score).toBe(1);
  });

  it("blocks high-confidence sequential automation", () => {
    const samples = Array.from({ length: 10 }, (_, index) => ({
      timestamp: now - (9 - index) * 1_000,
      novelId: "novel-a",
      chapterNumber: index + 1,
    }));
    const result = calculateChapterRisk({
      authenticated: false,
      samples,
      request: { nonBrowser: true, knownAutomation: true },
      now,
      limits,
    });
    expect(result).toMatchObject({ allowed: false, riskLevel: "HIGH", sequentialCount: 10 });
  });

  it("expires samples outside the one-hour sliding window", () => {
    const result = calculateChapterRisk({
      authenticated: true,
      samples: [
        { timestamp: now - 3_700_000, novelId: "old", chapterNumber: 1 },
        { timestamp: now, novelId: "current", chapterNumber: 2 },
      ],
      request: { nonBrowser: false, knownAutomation: false },
      now,
      limits,
    });
    expect(result.oneHourCount).toBe(1);
    expect(result.uniqueNovelCount).toBe(1);
  });
});
