import { createHash } from "node:crypto";

import { getRedisRuntimeEnv } from "@/lib/env";

function namespace() {
  const configured = getRedisRuntimeEnv().REDIS_CACHE_PREFIX;
  const safe = configured.replace(/[^a-zA-Z0-9_-]/gu, "-").slice(0, 64);
  return `${safe || "niyainow"}:v1`;
}

function segment(value: string | number) {
  return encodeURIComponent(String(value).trim().toLowerCase());
}

export function cacheDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
}

export const cacheKeys = {
  novel: (slug: string, version: number, taxonomyVersion: number) =>
    `${namespace()}:novel:${segment(slug)}:v${version}:t${taxonomyVersion}`,
  novelRelated: (slug: string, resource: string, argument: string | number, version: number) =>
    `${namespace()}:novel-related:${segment(slug)}:${segment(resource)}:v${version}:${segment(argument)}`,
  chapterList: (slug: string, page: number, version: number) =>
    `${namespace()}:chapter-list:${segment(slug)}:v${version}:page:${page}`,
  latestChapters: (slug: string, limit: number, version: number) =>
    `${namespace()}:chapter-latest:${segment(slug)}:v${version}:limit:${limit}`,
  firstChapters: (slug: string, limit: number, version: number) =>
    `${namespace()}:chapter-first:${segment(slug)}:v${version}:limit:${limit}`,
  chapterReader: (slug: string, chapterNumber: string | number, version: number) =>
    `${namespace()}:chapter-reader:${segment(slug)}:v${version}:chapter:${segment(chapterNumber)}`,
  catalogPage: (digest: string, version: number) => `${namespace()}:catalog:v${version}:${segment(digest)}`,
  home: (section: string, argument: string | number, version: number) =>
    `${namespace()}:home:${segment(section)}:v${version}:${segment(argument)}`,
  ranking: (period: string, limit: number, version: number) =>
    `${namespace()}:ranking:${segment(period)}:v${version}:limit:${limit}`,
  taxonomy: (resource: string, argument: string | number, version: number) =>
    `${namespace()}:taxonomy:${segment(resource)}:v${version}:${segment(argument)}`,
  banner: (limit: number, version: number) => `${namespace()}:banner:v${version}:limit:${limit}`,
  lock: (key: string) => `${key}:lock`,
  versions: {
    catalog: () => `${namespace()}:version:catalog`,
    novel: (slug: string) => `${namespace()}:version:novel:${segment(slug)}`,
    chapters: (slug: string) => `${namespace()}:version:chapters:${segment(slug)}`,
    homepage: () => `${namespace()}:version:homepage`,
    ranking: () => `${namespace()}:version:ranking`,
    taxonomy: () => `${namespace()}:version:taxonomy`,
    banner: () => `${namespace()}:version:banner`,
  },
} as const;
