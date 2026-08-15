import "server-only";

import { createClient, type RedisClientType } from "redis";

import { getRedisRuntimeEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

export type RedisClient = RedisClientType;

declare global {
  var __niyainowRedisClient: RedisClient | undefined;
  var __niyainowRedisConnectPromise: Promise<RedisClient | null> | undefined;
}

const redisLogger = logger.child({ component: "redis" });
let lastWarningAt = 0;

function warnSampled(message: string, error?: unknown) {
  const now = Date.now();
  if (now - lastWarningAt < 60_000) return;
  lastWarningAt = now;
  redisLogger.warn(message, error ? { error } : {});
}

function cacheConfigured() {
  const env = getRedisRuntimeEnv();
  if (!env.CACHE_ENABLED || !env.REDIS_ENABLED) return false;
  if (!env.REDIS_URL && !env.REDIS_HOST) {
    warnSampled("Redis caching is enabled but REDIS_URL/REDIS_HOST is missing");
    return false;
  }
  return true;
}

export function isRedisCacheEnabled() {
  return cacheConfigured();
}

function connectionUrl() {
  const env = getRedisRuntimeEnv();
  if (env.REDIS_URL) return env.REDIS_URL;
  if (!env.REDIS_HOST) return undefined;

  const url = new URL(`${env.REDIS_SSL ? "rediss" : "redis"}://${env.REDIS_HOST}`);
  url.port = String(env.REDIS_PORT);
  url.pathname = `/${env.REDIS_DATABASE}`;
  if (env.REDIS_USERNAME) url.username = env.REDIS_USERNAME;
  if (env.REDIS_PASSWORD) url.password = env.REDIS_PASSWORD;
  return url.toString();
}

function createRedisClient() {
  const env = getRedisRuntimeEnv();
  const url = connectionUrl();
  if (!url) return undefined;

  const client = createClient({
    url,
    disableOfflineQueue: true,
    commandsQueueMaxLength: 1_000,
    socket: {
      connectTimeout: env.REDIS_TIMEOUT_MS,
      reconnectStrategy: (retries) => (retries >= 5 ? false : Math.min(50 * 2 ** retries, 1_000)),
    },
  });
  client.on("error", (error) => warnSampled("Redis client error; cache operations will fall back", error));
  if (env.REDIS_DEBUG) {
    client.on("ready", () => redisLogger.debug("Redis connection ready"));
    client.on("reconnecting", () => redisLogger.debug("Redis reconnecting"));
  }
  return client;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Redis ${operation} timed out`)), timeoutMs);
    timer.unref?.();
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function connectRedis(): Promise<RedisClient | null> {
  if (!cacheConfigured()) return null;
  const env = getRedisRuntimeEnv();
  const client = globalThis.__niyainowRedisClient ?? createRedisClient();
  if (!client) return null;
  globalThis.__niyainowRedisClient = client;
  if (client.isReady) return client;

  if (!globalThis.__niyainowRedisConnectPromise) {
    const connectPromise: Promise<RedisClient | null> = withTimeout(client.connect(), env.REDIS_TIMEOUT_MS, "connect")
      .then(() => client)
      .catch((error) => {
        warnSampled("Redis connection unavailable; using the database fallback", error);
        return null;
      })
      .finally(() => {
        globalThis.__niyainowRedisConnectPromise = undefined;
      });
    globalThis.__niyainowRedisConnectPromise = connectPromise;
  }
  return globalThis.__niyainowRedisConnectPromise ?? null;
}

export async function runRedisCommand<T>(operation: string, command: (client: RedisClient) => Promise<T>) {
  const client = await connectRedis();
  if (!client?.isReady) throw new Error("Redis cache is unavailable");

  try {
    return await withTimeout(command(client), getRedisRuntimeEnv().REDIS_TIMEOUT_MS, operation);
  } catch (error) {
    warnSampled("Redis command failed; using the database fallback", error);
    throw error;
  }
}

/** Test/one-shot cleanup. Request paths must reuse the process-level client. */
export async function destroyRedisClient() {
  const client = globalThis.__niyainowRedisClient;
  globalThis.__niyainowRedisClient = undefined;
  globalThis.__niyainowRedisConnectPromise = undefined;
  if (!client) return;
  if (client.isOpen) client.destroy();
}
