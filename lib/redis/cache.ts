import "server-only";

import { getRedisRuntimeEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runRedisCommand, isRedisCacheEnabled } from "@/lib/redis/client";
import { cacheKeys } from "@/lib/redis/keys";
import { acquireDistributedLock, releaseDistributedLock, type DistributedLock } from "@/lib/redis/lock";
import { recordCacheMetric, type CacheCategory } from "@/lib/redis/metrics";
import { jitterTtl } from "@/lib/redis/ttl";

export interface CacheDriver {
  get(key: string): Promise<string | null>;
  mGet(keys: string[]): Promise<Array<string | null>>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  version(key: string): Promise<number>;
  invalidate(keys: string[], versionKeys: string[]): Promise<void>;
  acquireLock(key: string, ttlMs: number): Promise<DistributedLock | null>;
  releaseLock(lock: DistributedLock): Promise<void>;
}

const redisDriver: CacheDriver = {
  get: (key) => runRedisCommand("get", (client) => client.get(key)),
  mGet: (keys) => runRedisCommand("mget", (client) => client.mGet(keys)),
  set: async (key, value, ttlSeconds) => {
    await runRedisCommand("set", (client) => client.set(key, value, { EX: ttlSeconds }));
  },
  version: (key) => runRedisCommand("version", (client) => client.incrBy(key, 0)),
  invalidate: async (keys, versionKeys) => {
    await runRedisCommand("invalidate", async (client) => {
      const transaction = client.multi();
      if (keys.length > 0) transaction.del(keys);
      for (const key of versionKeys) transaction.incr(key);
      await transaction.exec();
    });
  },
  acquireLock: acquireDistributedLock,
  releaseLock: releaseDistributedLock,
};

type CacheValue<T> = { value: T };
type CacheLookup<T> = { status: "hit"; value: T } | { status: "miss" | "error" | "bypass" };

export type GetOrSetOptions<T> = {
  key: string;
  ttlSeconds: number;
  category: CacheCategory;
  loader: () => Promise<T>;
  stampedeProtection?: boolean;
};

type ApplicationCacheOptions = {
  driver?: CacheDriver;
  enabled?: () => boolean;
  random?: () => number;
  maxItemBytes?: () => number;
};

const cacheLogger = logger.child({ component: "application-cache" });

export function createApplicationCache(options: ApplicationCacheOptions = {}) {
  const driver = options.driver ?? redisDriver;
  const enabled = options.enabled ?? isRedisCacheEnabled;
  const random = options.random ?? Math.random;
  const maxItemBytes = options.maxItemBytes ?? (() => getRedisRuntimeEnv().REDIS_MAX_ITEM_BYTES);
  const inFlight = new Map<string, Promise<unknown>>();
  const versionInFlight = new Map<string, Promise<number | undefined>>();

  async function get<T>(key: string, category: CacheCategory): Promise<CacheLookup<T>> {
    if (!enabled()) {
      recordCacheMetric("bypass", category);
      return { status: "bypass" };
    }
    try {
      const serialized = await driver.get(key);
      if (serialized === null) {
        recordCacheMetric("miss", category);
        return { status: "miss" };
      }
      const parsed = JSON.parse(serialized) as CacheValue<T>;
      recordCacheMetric("hit", category);
      return { status: "hit", value: parsed.value };
    } catch {
      recordCacheMetric("error", category);
      return { status: "error" };
    }
  }

  async function mGet<T>(keys: string[], category: CacheCategory): Promise<Array<CacheLookup<T>>> {
    if (keys.length === 0) return [];
    if (!enabled()) {
      return keys.map(() => {
        recordCacheMetric("bypass", category);
        return { status: "bypass" } as const;
      });
    }
    try {
      const values = await driver.mGet(keys);
      return values.map((serialized): CacheLookup<T> => {
        if (serialized === null) {
          recordCacheMetric("miss", category);
          return { status: "miss" };
        }
        recordCacheMetric("hit", category);
        return { status: "hit", value: (JSON.parse(serialized) as CacheValue<T>).value };
      });
    } catch {
      return keys.map(() => {
        recordCacheMetric("error", category);
        return { status: "error" } as const;
      });
    }
  }

  async function set<T>(key: string, value: T, ttlSeconds: number, category: CacheCategory) {
    if (!enabled() || value === undefined) return false;
    try {
      const serialized = JSON.stringify({ value } satisfies CacheValue<T>);
      const bytes = Buffer.byteLength(serialized);
      if (bytes > maxItemBytes()) {
        recordCacheMetric("bypass", category);
        cacheLogger.warn("Cache item exceeded configured size limit", { category, bytes });
        return false;
      }
      await driver.set(key, serialized, jitterTtl(ttlSeconds, random));
      recordCacheMetric("write", category);
      return true;
    } catch {
      recordCacheMetric("error", category);
      return false;
    }
  }

  async function waitForWinner<T>(key: string, category: CacheCategory) {
    for (const delayMs of [20, 40, 80]) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      const lookup = await get<T>(key, category);
      if (lookup.status === "hit") return lookup;
      if (lookup.status === "error" || lookup.status === "bypass") break;
    }
    return undefined;
  }

  async function regenerate<T>(input: GetOrSetOptions<T>) {
    let lock: DistributedLock | null = null;
    let redisHealthy = enabled();
    if (redisHealthy && input.stampedeProtection !== false) {
      try {
        lock = await driver.acquireLock(cacheKeys.lock(input.key), 3_000);
        if (!lock) {
          const winner = await waitForWinner<T>(input.key, input.category);
          if (winner?.status === "hit") return winner.value;
        }
      } catch {
        redisHealthy = false;
        recordCacheMetric("error", input.category);
      }
    }

    try {
      const value = await input.loader();
      if (redisHealthy && (lock || input.stampedeProtection === false)) {
        await set(input.key, value, input.ttlSeconds, input.category);
      }
      return value;
    } finally {
      if (lock) {
        try {
          await driver.releaseLock(lock);
        } catch {
          recordCacheMetric("error", input.category);
        }
      }
    }
  }

  async function getOrSet<T>(input: GetOrSetOptions<T>): Promise<T> {
    const lookup = await get<T>(input.key, input.category);
    if (lookup.status === "hit") return lookup.value;
    if (lookup.status === "error" || lookup.status === "bypass") return input.loader();

    const existing = inFlight.get(input.key) as Promise<T> | undefined;
    if (existing) return existing;
    const promise = regenerate(input).finally(() => {
      if (inFlight.get(input.key) === promise) inFlight.delete(input.key);
    });
    inFlight.set(input.key, promise);
    return promise;
  }

  async function version(key: string) {
    if (!enabled()) return undefined;
    const existing = versionInFlight.get(key);
    if (existing) return existing;
    const promise = driver.version(key)
      .catch(() => {
        recordCacheMetric("error", "internal");
        return undefined;
      })
      .finally(() => {
        if (versionInFlight.get(key) === promise) versionInFlight.delete(key);
      });
    versionInFlight.set(key, promise);
    return promise;
  }

  async function invalidate(keys: string[], versionKeys: string[], category: CacheCategory) {
    if (!enabled()) {
      recordCacheMetric("bypass", category);
      return false;
    }
    try {
      await driver.invalidate([...new Set(keys)], [...new Set(versionKeys)]);
      recordCacheMetric("invalidate", category);
      return true;
    } catch {
      recordCacheMetric("error", category);
      return false;
    }
  }

  return { get, mGet, set, getOrSet, version, invalidate };
}

export const applicationCache = createApplicationCache();
