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

export async function invalidateEngagementCache(slug?: string) {
  await applicationCache.invalidate(
    [],
    [
      ...(slug ? [cacheKeys.versions.novel(slug)] : []),
      cacheKeys.versions.catalog(),
      cacheKeys.versions.homepage(),
      cacheKeys.versions.ranking(),
    ],
    "novel",
  );
}
