import "server-only";

import { applicationCache } from "@/lib/redis/cache";
import { cacheKeys } from "@/lib/redis/keys";

export async function invalidateNovelCache(slug: string, includeTaxonomy = false) {
  await applicationCache.invalidate(
    [],
    [
      cacheKeys.versions.novel(slug),
      cacheKeys.versions.catalog(),
      cacheKeys.versions.homepage(),
      cacheKeys.versions.ranking(),
      cacheKeys.versions.chapters(slug),
      ...(includeTaxonomy ? [cacheKeys.versions.taxonomy()] : []),
    ],
    "novel",
  );
}

export async function invalidateChapterCache(slug: string) {
  await applicationCache.invalidate(
    [],
    [
      cacheKeys.versions.novel(slug),
      cacheKeys.versions.chapters(slug),
      cacheKeys.versions.catalog(),
      cacheKeys.versions.homepage(),
      cacheKeys.versions.ranking(),
    ],
    "chapter",
  );
}

export async function invalidateTaxonomyCache() {
  await applicationCache.invalidate(
    [],
    [cacheKeys.versions.taxonomy(), cacheKeys.versions.catalog(), cacheKeys.versions.homepage()],
    "taxonomy",
  );
}

export async function invalidateBannerCache() {
  await applicationCache.invalidate([], [cacheKeys.versions.banner()], "banner");
}

export async function invalidateEngagementCache(slug: string) {
  await applicationCache.invalidate(
    [],
    [cacheKeys.versions.novel(slug)],
    "novel",
  );
}

export async function invalidatePublishedReviewsCache(slug: string) {
  await applicationCache.invalidate(
    [],
    [cacheKeys.versions.reviews(slug), cacheKeys.versions.novel(slug)],
    "novel",
  );
}

export async function invalidateImportedNovelCaches(slugs: string[]) {
  const uniqueSlugs = [...new Set(slugs)];
  if (uniqueSlugs.length === 0) return;
  await applicationCache.invalidate(
    [],
    [
      ...uniqueSlugs.flatMap((slug) => [
        cacheKeys.versions.novel(slug),
        cacheKeys.versions.chapters(slug),
      ]),
      cacheKeys.versions.catalog(),
      cacheKeys.versions.homepage(),
      cacheKeys.versions.ranking(),
      cacheKeys.versions.taxonomy(),
    ],
    "novel",
  );
}
