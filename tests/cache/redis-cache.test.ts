import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { toPublicChapterCachePayload } from "@/lib/domain/chapter-cache";
import { createApplicationCache, type CacheDriver } from "@/lib/redis/cache";
import { cacheKeys } from "@/lib/redis/keys";
import { jitterTtl } from "@/lib/redis/ttl";

class MemoryCacheDriver implements CacheDriver {
  readonly values = new Map<string, string>();
  readonly versions = new Map<string, number>();
  readonly locks = new Map<string, string>();
  reads = 0;
  writes = 0;
  invalidations = 0;
  fail = false;

  private assertAvailable() {
    if (this.fail) throw new Error("redis unavailable");
  }

  async get(key: string) {
    this.assertAvailable();
    this.reads += 1;
    return this.values.get(key) ?? null;
  }

  async mGet(keys: string[]) {
    this.assertAvailable();
    this.reads += 1;
    return keys.map((key) => this.values.get(key) ?? null);
  }

  async set(key: string, value: string) {
    this.assertAvailable();
    this.writes += 1;
    this.values.set(key, value);
  }

  async version(key: string) {
    this.assertAvailable();
    const current = this.versions.get(key) ?? 0;
    this.versions.set(key, current);
    return current;
  }

  async invalidate(keys: string[], versionKeys: string[]) {
    this.assertAvailable();
    this.invalidations += 1;
    for (const key of keys) this.values.delete(key);
    for (const key of versionKeys) this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }

  async acquireLock(key: string) {
    this.assertAvailable();
    if (this.locks.has(key)) return null;
    const lock = { key, token: `token-${this.locks.size + 1}` };
    this.locks.set(key, lock.token);
    return lock;
  }

  async releaseLock(lock: { key: string; token: string }) {
    this.assertAvailable();
    if (this.locks.get(lock.key) === lock.token) this.locks.delete(lock.key);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("application Redis cache", () => {
  it("uses cache-aside and returns a hit without repeating the loader", async () => {
    const driver = new MemoryCacheDriver();
    const cache = createApplicationCache({ driver, enabled: () => true, random: () => 0.5 });
    const loader = vi.fn(async () => ({ title: "cached" }));

    const first = await cache.getOrSet({ key: "novel:one", ttlSeconds: 60, category: "novel", loader });
    const second = await cache.getOrSet({ key: "novel:one", ttlSeconds: 60, category: "novel", loader });

    expect(first).toEqual({ title: "cached" });
    expect(second).toEqual(first);
    expect(loader).toHaveBeenCalledTimes(1);
    expect(driver.writes).toBe(1);
  });

  it("coalesces concurrent hot-key misses in process", async () => {
    const driver = new MemoryCacheDriver();
    const cache = createApplicationCache({ driver, enabled: () => true });
    const loader = vi.fn(async () => {
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
      return "chapter";
    });

    const values = await Promise.all(
      Array.from({ length: 50 }, () =>
        cache.getOrSet({ key: "chapter:1", ttlSeconds: 60, category: "chapter", loader }),
      ),
    );

    expect(new Set(values)).toEqual(new Set(["chapter"]));
    expect(loader).toHaveBeenCalledTimes(1);
    expect(driver.locks.size).toBe(0);
  });

  it("falls back to the loader when Redis is unavailable", async () => {
    const driver = new MemoryCacheDriver();
    driver.fail = true;
    const cache = createApplicationCache({ driver, enabled: () => true });
    const loader = vi.fn(async () => "database");

    await expect(
      cache.getOrSet({ key: "novel:fallback", ttlSeconds: 60, category: "novel", loader }),
    ).resolves.toBe("database");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("deletes direct keys and bumps collection versions without wildcard scans", async () => {
    const driver = new MemoryCacheDriver();
    const cache = createApplicationCache({ driver, enabled: () => true });
    driver.values.set("novel:one", JSON.stringify({ value: "old" }));

    expect(await cache.version("catalog-version")).toBe(0);
    await cache.invalidate(["novel:one"], ["catalog-version"], "novel");

    expect(driver.values.has("novel:one")).toBe(false);
    expect(await cache.version("catalog-version")).toBe(1);
    expect(driver.invalidations).toBe(1);
  });

  it("serves a novel edit after the post-commit direct-key invalidation", async () => {
    const driver = new MemoryCacheDriver();
    const cache = createApplicationCache({ driver, enabled: () => true, random: () => 0.5 });
    const versionKey = cacheKeys.versions.novel("edited-story");
    const taxonomyVersionKey = cacheKeys.versions.taxonomy();
    const beforeVersion = await cache.version(versionKey) ?? 0;
    const taxonomyVersion = await cache.version(taxonomyVersionKey) ?? 0;
    const key = cacheKeys.novel("edited-story", beforeVersion, taxonomyVersion);

    await expect(cache.getOrSet({
      key,
      ttlSeconds: 60,
      category: "novel",
      loader: async () => ({ title: "old" }),
    })).resolves.toEqual({ title: "old" });
    await cache.invalidate([], [versionKey, cacheKeys.versions.catalog()], "novel");
    const afterVersion = await cache.version(versionKey) ?? 0;
    const refreshedKey = cacheKeys.novel("edited-story", afterVersion, taxonomyVersion);
    await expect(cache.getOrSet({
      key: refreshedKey,
      ttlSeconds: 60,
      category: "novel",
      loader: async () => ({ title: "new" }),
    })).resolves.toEqual({ title: "new" });
  });

  it("moves a published chapter list to a new version", async () => {
    const driver = new MemoryCacheDriver();
    const cache = createApplicationCache({ driver, enabled: () => true, random: () => 0.5 });
    const versionKey = cacheKeys.versions.chapters("story");
    const beforeVersion = await cache.version(versionKey);
    const beforeKey = cacheKeys.chapterList("story", 1, beforeVersion ?? 0);
    await cache.getOrSet({
      key: beforeKey,
      ttlSeconds: 60,
      category: "chapter-list",
      loader: async () => Array.from({ length: 100 }, (_, index) => index + 1),
    });

    await cache.invalidate([], [versionKey], "chapter-list");
    const afterVersion = await cache.version(versionKey);
    const afterKey = cacheKeys.chapterList("story", 1, afterVersion ?? 0);
    const chapters = await cache.getOrSet({
      key: afterKey,
      ttlSeconds: 60,
      category: "chapter-list",
      loader: async () => Array.from({ length: 101 }, (_, index) => index + 1),
    });

    expect(afterKey).not.toBe(beforeKey);
    expect(chapters).toHaveLength(101);
  });

  it("never copies restricted source content into a shared chapter payload", async () => {
    const driver = new MemoryCacheDriver();
    const cache = createApplicationCache({ driver, enabled: () => true, random: () => 0.5 });
    const privateContent = "PRIVATE-PAID-CONTENT";
    const source = {
      chapter: {
        id: "chapter-id",
        novelSlug: "story",
        number: 1,
        slug: "chapter-1",
        sortOrder: 1,
        title: "One",
        updatedAt: "today",
        wordCount: 100,
        locked: true,
        coinPrice: 10,
      },
      isFree: false,
      publicContent: "editorial excerpt",
      privateContent,
    };
    const publicPayload = toPublicChapterCachePayload(source);

    const userA = await cache.getOrSet({
      key: "chapter:paid",
      ttlSeconds: 60,
      category: "chapter",
      loader: async () => publicPayload,
    });
    const userB = await cache.getOrSet({
      key: "chapter:paid",
      ttlSeconds: 60,
      category: "chapter",
      loader: async () => publicPayload,
    });

    expect(userA).toEqual({ chapter: source.chapter, content: "editorial excerpt", locked: true });
    expect(userB).toEqual(userA);
    expect([...driver.values.values()].join("\n")).not.toContain(privateContent);
  });
});

describe("TTL jitter", () => {
  it("keeps jitter within ten percent and never below one second", () => {
    expect(jitterTtl(100, () => 0)).toBe(90);
    expect(jitterTtl(100, () => 0.999)).toBeLessThanOrEqual(109);
    expect(jitterTtl(1, () => 0)).toBe(1);
  });
});
