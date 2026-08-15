export const CACHE_TTL_SECONDS = {
  NOVEL_DETAIL: 15 * 60,
  CHAPTER_LIST: 10 * 60,
  CHAPTER_READER: 60 * 60,
  HOMEPAGE_LATEST: 90,
  HOMEPAGE_POPULAR: 3 * 60,
  HOMEPAGE_CATALOG: 5 * 60,
  GENRE_PAGE: 5 * 60,
  TAXONOMY: 10 * 60,
  RANKING: 5 * 60,
  BANNER: 60,
} as const;

export function jitterTtl(baseSeconds: number, random = Math.random) {
  const boundedBase = Math.max(1, Math.floor(baseSeconds));
  const variance = Math.max(1, Math.floor(boundedBase * 0.1));
  const offset = Math.floor((random() * 2 - 1) * variance);
  return Math.max(1, boundedBase + offset);
}
