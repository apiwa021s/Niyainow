/**
 * Shared Cache Components profiles for bounded public pages.
 *
 * Editorial mutations invalidate the matching tags immediately. These time
 * windows are fallback refresh intervals for scheduled publication and missed
 * invalidation events, not the primary freshness mechanism.
 */
export const PUBLIC_CACHE_LIFE = {
  live: { stale: 5 * 60, revalidate: 5 * 60, expire: 24 * 60 * 60 },
  discovery: { stale: 15 * 60, revalidate: 15 * 60, expire: 7 * 24 * 60 * 60 },
  catalog: { stale: 30 * 60, revalidate: 60 * 60, expire: 7 * 24 * 60 * 60 },
  taxonomy: { stale: 60 * 60, revalidate: 24 * 60 * 60, expire: 30 * 24 * 60 * 60 },
} as const;

export const PUBLIC_CACHE_TTL = {
  sitemap: 6 * 60 * 60,
  sitemapStale: 24 * 60 * 60,
} as const;
