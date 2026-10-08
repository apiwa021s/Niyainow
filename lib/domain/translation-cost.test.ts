import { describe, expect, it } from "vitest";

import { resolveTranslationCostPolicy, summarizeTranslationCosts, translationCostMicrosToThb } from "./translation-cost";

describe("translation cost planning", () => {
  it("uses the configured planning exchange rate when valid", () => {
    expect(resolveTranslationCostPolicy(" 32.75 ")).toEqual({
      targetAverageThb: 1,
      thbPerUsd: 32.75,
      rateSource: "CONFIGURED",
    });
    expect(translationCostMicrosToThb(20_000, 32.75)).toBeCloseTo(0.655);
  });

  it.each([undefined, "", " ", "0", "-1", "Infinity", "NaN", "invalid"])("uses the explicit planning default for invalid rate %s", (rate) => {
    expect(resolveTranslationCostPolicy(rate)).toEqual({
      targetAverageThb: 1,
      thbPerUsd: 35,
      rateSource: "PLANNING_DEFAULT",
    });
  });

  it("includes failed and repeated spending while counting produced chapters once", () => {
    const summary = summarizeTranslationCosts([
      { costMicros: 30_000, hasAiTranslation: true },
      { costMicros: 10_000, hasAiTranslation: false },
      { costMicros: 0, hasAiTranslation: true },
    ], resolveTranslationCostPolicy());

    expect(summary.totalCostMicros).toBe(40_000);
    expect(summary.producedChapterCount).toBe(2);
    expect(summary.averageCostMicros).toBe(20_000);
    expect(summary.totalCostThb).toBeCloseTo(1.4);
    expect(summary.averageCostThb).toBeCloseTo(0.7);
    expect(summary.targetGapThb).toBeCloseTo(-0.3);
  });

  it("keeps failure costs visible without inventing an average before any translation exists", () => {
    expect(summarizeTranslationCosts([{ costMicros: 50_000, hasAiTranslation: false }], resolveTranslationCostPolicy())).toMatchObject({
      totalCostMicros: 50_000,
      totalCostThb: 1.75,
      producedChapterCount: 0,
      averageCostMicros: null,
      averageCostThb: null,
      targetGapThb: null,
    });
  });

  it("reports how far the cumulative average exceeds the target", () => {
    const summary = summarizeTranslationCosts([{ costMicros: 40_000, hasAiTranslation: true }], resolveTranslationCostPolicy());
    expect(summary.averageCostThb).toBeCloseTo(1.4);
    expect(summary.targetGapThb).toBeCloseTo(0.4);
  });

  it("excludes manual-only revisions even when an AI attempt spent money and failed", () => {
    const chapters = [
      { costMicros: 30_000, revision: 1, hasAiTranslation: true },
      { costMicros: 20_000, revision: 4, hasAiTranslation: false },
      { costMicros: 0, revision: 2, hasAiTranslation: false },
    ];
    const summary = summarizeTranslationCosts(chapters, resolveTranslationCostPolicy());
    expect(summary.producedChapterCount).toBe(1);
    expect(summary.totalCostMicros).toBe(50_000);
    expect(summary.averageCostThb).toBeCloseTo(1.75);
  });

  it("counts a chapter that later produces an AI draft once while keeping all prior spend", () => {
    const chapters = [{ costMicros: 50_000, revision: 4, hasAiTranslation: true }];
    const summary = summarizeTranslationCosts(chapters, resolveTranslationCostPolicy());
    expect(summary.producedChapterCount).toBe(1);
    expect(summary.averageCostMicros).toBe(50_000);
  });
});
