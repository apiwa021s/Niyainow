/**
 * Public-search precedence is intentionally explicit. A single strongest match
 * wins so several weak taxonomy matches cannot outrank an exact title match.
 */
export const SEARCH_RELEVANCE_ORDER = [
  "titleExact",
  "originalTitleExact",
  "alternativeTitleExact",
  "titlePrefix",
  "originalTitlePrefix",
  "alternativeTitlePrefix",
  "titleContains",
  "originalTitleContains",
  "alternativeTitleContains",
  "authorExact",
  "translatorExact",
  "authorPrefix",
  "translatorPrefix",
  "authorContains",
  "translatorContains",
  "genreExact",
  "tagExact",
  "genrePrefix",
  "tagPrefix",
  "genreContains",
  "tagContains",
  "keywordContains",
] as const;

export type SearchRelevanceSignal = (typeof SEARCH_RELEVANCE_ORDER)[number];

export const SEARCH_RELEVANCE_WEIGHTS: Record<SearchRelevanceSignal, number> = {
  titleExact: 120,
  originalTitleExact: 116,
  alternativeTitleExact: 112,
  titlePrefix: 106,
  originalTitlePrefix: 102,
  alternativeTitlePrefix: 98,
  titleContains: 92,
  originalTitleContains: 88,
  alternativeTitleContains: 84,
  authorExact: 76,
  translatorExact: 72,
  authorPrefix: 68,
  translatorPrefix: 64,
  authorContains: 60,
  translatorContains: 56,
  genreExact: 48,
  tagExact: 46,
  genrePrefix: 42,
  tagPrefix: 40,
  genreContains: 34,
  tagContains: 32,
  keywordContains: 20,
};

export function bestSearchRelevance(
  signals: Partial<Record<SearchRelevanceSignal, boolean>>,
) {
  const match = SEARCH_RELEVANCE_ORDER.find((signal) => signals[signal]);
  return match ? SEARCH_RELEVANCE_WEIGHTS[match] : 0;
}
