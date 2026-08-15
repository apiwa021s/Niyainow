import { describe, expect, it } from "vitest";

import {
  bestSearchRelevance,
  SEARCH_RELEVANCE_ORDER,
  SEARCH_RELEVANCE_WEIGHTS,
} from "@/lib/search/relevance";

describe("public search relevance", () => {
  it("keeps every declared match class in strict precedence order", () => {
    const weights = SEARCH_RELEVANCE_ORDER.map((signal) => SEARCH_RELEVANCE_WEIGHTS[signal]);

    expect(weights.every((weight, index) => index === 0 || weights[index - 1] > weight)).toBe(true);
  });

  it("uses the strongest field match instead of adding weaker matches", () => {
    expect(bestSearchRelevance({
      alternativeTitleExact: true,
      authorExact: true,
      genreExact: true,
      keywordContains: true,
    })).toBe(SEARCH_RELEVANCE_WEIGHTS.alternativeTitleExact);

    expect(bestSearchRelevance({
      translatorContains: true,
      tagExact: true,
      keywordContains: true,
    })).toBe(SEARCH_RELEVANCE_WEIGHTS.translatorContains);
  });

  it("returns zero when no indexed field matches", () => {
    expect(bestSearchRelevance({})).toBe(0);
  });
});
