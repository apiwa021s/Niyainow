import "server-only";

import { getRedisRuntimeEnv, getSecurityRuntimeEnv } from "@/lib/env";
import { isRedisCacheEnabled, runRedisCommand } from "@/lib/redis/client";
import { logger } from "@/lib/logger";
import type { ChapterRiskLevel } from "@/lib/security/abuse-detection";

export const SECURITY_EVENT_NAMES = [
  "CHAPTER_READ",
  "CHAPTER_DENIED",
  "RATE_LIMIT",
  "SCRAPING_SUSPECTED",
  "ENTITLEMENT_FAILED",
  "AUTH_FAILED",
] as const;

export type SecurityEventName = (typeof SECURITY_EVENT_NAMES)[number];
export type SecurityEvent = {
  event: SecurityEventName;
  subjectHash: string;
  ipHash: string;
  chapterId?: string;
  novelId?: string;
  result: string;
  riskLevel: ChapterRiskLevel;
  score?: number;
  timestamp?: Date;
};

const securityLogger = logger.child({ component: "reader-security" });

function dayKey(timestamp: Date) {
  return timestamp.toISOString().slice(0, 10).replaceAll("-", "");
}

export async function recordSecurityEvent(event: SecurityEvent) {
  const env = getSecurityRuntimeEnv();
  if (!env.SECURITY_LOG_ENABLED) return;
  const timestamp = event.timestamp ?? new Date();
  const payload = { ...event, timestamp: timestamp.toISOString() };
  const level = event.event === "RATE_LIMIT" || event.event === "SCRAPING_SUSPECTED" ? "warn" : "info";
  securityLogger[level]("security_event", payload);

  if (!isRedisCacheEnabled()) return;
  const prefix = getRedisRuntimeEnv().REDIS_CACHE_PREFIX;
  const suffix = dayKey(timestamp);
  const metricsKey = `${prefix}:security:metrics:${suffix}`;
  const subjectsKey = `${prefix}:security:suspicious-subjects:${suffix}`;
  const novelsKey = `${prefix}:security:suspicious-novels:${suffix}`;
  try {
    await runRedisCommand("security-metrics", async (client) => {
      const transaction = client.multi()
        .hIncrBy(metricsKey, event.event, 1)
        .hIncrBy(metricsKey, "chapter_requests", event.event === "CHAPTER_READ" ? 1 : 0)
        .expire(metricsKey, 60 * 60 * 24 * 8);
      if (event.riskLevel !== "LOW") {
        transaction
          .zIncrBy(subjectsKey, event.riskLevel === "HIGH" ? 3 : 1, event.subjectHash)
          .expire(subjectsKey, 60 * 60 * 24 * 8);
        if (event.novelId) {
          transaction
            .zIncrBy(novelsKey, event.riskLevel === "HIGH" ? 3 : 1, event.novelId)
            .expire(novelsKey, 60 * 60 * 24 * 8);
        }
      }
      await transaction.exec();
    });
  } catch {
    // Structured logs remain the durable fallback when Redis is unavailable.
  }
}

export type SecurityMetricsSnapshot = {
  available: boolean;
  period: string;
  counters: Record<string, number>;
  suspiciousSubjects: Array<{ subjectHash: string; score: number }>;
  suspiciousNovels: Array<{ novelId: string; score: number }>;
};

export async function getSecurityMetricsSnapshot(now = new Date()): Promise<SecurityMetricsSnapshot> {
  const period = dayKey(now);
  if (!isRedisCacheEnabled()) {
    return { available: false, period, counters: {}, suspiciousSubjects: [], suspiciousNovels: [] };
  }
  const prefix = getRedisRuntimeEnv().REDIS_CACHE_PREFIX;
  try {
    return await runRedisCommand("security-dashboard", async (client) => {
      const [rawCounters, subjectRows, novelRows] = await Promise.all([
        client.hGetAll(`${prefix}:security:metrics:${period}`),
        client.zRangeWithScores(`${prefix}:security:suspicious-subjects:${period}`, -10, -1),
        client.zRangeWithScores(`${prefix}:security:suspicious-novels:${period}`, -10, -1),
      ]);
      return {
        available: true,
        period,
        counters: Object.fromEntries(Object.entries(rawCounters).map(([key, value]) => [key, Number(value)])),
        suspiciousSubjects: subjectRows.reverse().map((row) => ({ subjectHash: row.value, score: row.score })),
        suspiciousNovels: novelRows.reverse().map((row) => ({ novelId: row.value, score: row.score })),
      };
    });
  } catch {
    return { available: false, period, counters: {}, suspiciousSubjects: [], suspiciousNovels: [] };
  }
}
