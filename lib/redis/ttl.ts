export const CACHE_TTL_SECONDS = {
  // Editorial mutations invalidate this key explicitly. The long TTL is a
  // safety net for missed events and keeps stable detail data out of Postgres.
  NOVEL_DETAIL: 24 * 60 * 60,
  CHAPTER_LIST: 30 * 60,
  CHAPTER_READER: 24 * 60 * 60,
  HOMEPAGE_LATEST: 5 * 60,
  HOMEPAGE_POPULAR: 15 * 60,
  HOMEPAGE_CATALOG: 30 * 60,
  GENRE_PAGE: 60 * 60,
  TAXONOMY: 24 * 60 * 60,
  RANKING: 15 * 60,
  REVIEWS: 24 * 60 * 60,
  BANNER: 60,
} as const;

export function jitterTtl(baseSeconds: number, random = Math.random) {
  const boundedBase = Math.max(1, Math.floor(baseSeconds));
  const variance = Math.max(1, Math.floor(boundedBase * 0.1));
  const offset = Math.floor((random() * 2 - 1) * variance);
  return Math.max(1, boundedBase + offset);
}
