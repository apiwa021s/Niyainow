import "server-only";

import { isRedisCacheEnabled, runRedisCommand } from "@/lib/redis/client";
import { takeRateLimit, type RateLimitResult } from "@/lib/security/rate-limit";

/**
 * A shared counter so the limit holds across every write instance. Falls back
 * to the process-local window whenever Redis is disabled or unreachable, so a
 * cache outage degrades to the old behaviour instead of removing the limit.
 */
export async function takeDistributedRateLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number },
): Promise<RateLimitResult> {
  if (!isRedisCacheEnabled()) return takeRateLimit(key, options);

  const now = options.now ?? Date.now();
  const windowIndex = Math.floor(now / options.windowMs);
  const resetAt = (windowIndex + 1) * options.windowMs;
  const redisKey = `ratelimit:${key}:${windowIndex}`;

  try {
    const count = await runRedisCommand("rate-limit-incr", async (client) => {
      const value = await client.incr(redisKey);
      if (value === 1) await client.pExpire(redisKey, options.windowMs);
      return value;
    });

    return {
      allowed: count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - count),
      resetAt,
    };
  } catch {
    return takeRateLimit(key, options);
  }
}
