import "server-only";

import { getRedisRuntimeEnv, getSecurityRuntimeEnv } from "@/lib/env";
import { isRedisCacheEnabled, runRedisCommand } from "@/lib/redis/client";
import type { RequestIdentity } from "@/lib/security/request-identity";

const FIVE_MINUTES_MS = 5 * 60 * 1_000;
const ONE_HOUR_MS = 60 * 60 * 1_000;
const MAX_LOCAL_SUBJECTS = 10_000;

type ChapterAccessSample = {
  timestamp: number;
  novelId: string;
  chapterNumber: number;
};

export type ChapterRiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type ChapterRiskAssessment = {
  allowed: boolean;
  riskLevel: ChapterRiskLevel;
  score: number;
  retryAfterSeconds: number;
  fiveMinuteCount: number;
  oneHourCount: number;
  sequentialCount: number;
  uniqueNovelCount: number;
};

const localSamples = new Map<string, ChapterAccessSample[]>();

function requestSignals(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  const hasBrowserSignals = Boolean(
    request.headers.get("sec-fetch-site")
    || request.headers.get("sec-ch-ua")
    || request.headers.get("accept-language"),
  );
  return {
    nonBrowser: !hasBrowserSignals,
    knownAutomation: /\b(?:curl|wget|python-requests|aiohttp|scrapy|go-http-client|headlesschrome)\b/iu.test(userAgent),
  };
}

export function calculateChapterRisk(input: {
  authenticated: boolean;
  samples: ChapterAccessSample[];
  request: Pick<ReturnType<typeof requestSignals>, "nonBrowser" | "knownAutomation">;
  now: number;
  limits?: {
    fiveMinutes: number;
    oneHour: number;
    sequential: number;
  };
}): ChapterRiskAssessment {
  const env = getSecurityRuntimeEnv();
  const limits = input.limits ?? {
    fiveMinutes: input.authenticated ? env.CHAPTER_RATE_LIMIT_5M : env.CHAPTER_RATE_LIMIT_ANONYMOUS_5M,
    oneHour: input.authenticated ? env.CHAPTER_RATE_LIMIT_1H : env.CHAPTER_RATE_LIMIT_ANONYMOUS_1H,
    sequential: env.SCRAPER_SEQUENTIAL_THRESHOLD,
  };
  const recent = input.samples
    .filter((sample) => sample.timestamp > input.now - ONE_HOUR_MS)
    .sort((a, b) => a.timestamp - b.timestamp);
  const fiveMinuteCount = recent.filter((sample) => sample.timestamp > input.now - FIVE_MINUTES_MS).length;
  const uniqueNovelCount = new Set(recent.map((sample) => sample.novelId)).size;

  let sequentialCount = recent.length > 0 ? 1 : 0;
  for (let index = recent.length - 1; index > 0; index -= 1) {
    const current = recent[index];
    const previous = recent[index - 1];
    if (current.novelId !== previous.novelId || Math.abs(current.chapterNumber - previous.chapterNumber) !== 1) break;
    sequentialCount += 1;
  }

  let score = 0;
  const overFiveMinutes = fiveMinuteCount > limits.fiveMinutes;
  const overOneHour = recent.length > limits.oneHour;
  if (overFiveMinutes || overOneHour) score += 1;
  if (sequentialCount >= limits.sequential) score += 2;
  if (uniqueNovelCount >= 8) score += 2;
  if (input.request.nonBrowser) score += 2;
  if (fiveMinuteCount > Math.ceil(limits.fiveMinutes * 1.25) || recent.length > Math.ceil(limits.oneHour * 1.1)) score += 3;
  if (input.request.knownAutomation) score += 3;

  const riskLevel: ChapterRiskLevel = score >= 6 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
  return {
    allowed: riskLevel !== "HIGH",
    riskLevel,
    score,
    retryAfterSeconds: overOneHour ? 60 * 60 : overFiveMinutes ? 5 * 60 : 60,
    fiveMinuteCount,
    oneHourCount: recent.length,
    sequentialCount,
    uniqueNovelCount,
  };
}

async function loadSamples(storageKey: string, sample: ChapterAccessSample) {
  const cutoff = sample.timestamp - ONE_HOUR_MS;
  if (isRedisCacheEnabled()) {
    const prefix = getRedisRuntimeEnv().REDIS_CACHE_PREFIX;
    const key = `${prefix}:security:chapter-access:${storageKey}`;
    try {
      return await runRedisCommand("chapter-abuse-window", async (client) => {
        const results = await client.multi()
          .zAdd(key, {
            score: sample.timestamp,
            value: `${sample.timestamp}:${crypto.randomUUID()}:${sample.novelId}:${sample.chapterNumber}`,
          })
          .zRemRangeByScore(key, 0, cutoff)
          .expire(key, 60 * 65)
          .zRangeByScore(key, cutoff, sample.timestamp)
          .exec();
        const values = results[3] as unknown as string[];
        return values.flatMap((value): ChapterAccessSample[] => {
          const [timestamp, , novelId, chapterNumber] = value.split(":");
          const parsedTimestamp = Number(timestamp);
          const parsedChapter = Number(chapterNumber);
          return Number.isFinite(parsedTimestamp) && Number.isFinite(parsedChapter)
            ? [{ timestamp: parsedTimestamp, novelId, chapterNumber: parsedChapter }]
            : [];
        });
      });
    } catch {
      // Fall through to the bounded process-local safety net.
    }
  }

  const current = (localSamples.get(storageKey) ?? []).filter((item) => item.timestamp > cutoff);
  current.push(sample);
  localSamples.set(storageKey, current);
  if (localSamples.size > MAX_LOCAL_SUBJECTS) localSamples.delete(localSamples.keys().next().value as string);
  return current;
}

export async function assessChapterRequest(input: {
  request: Request;
  identity: RequestIdentity;
  novelId: string;
  chapterNumber: number;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const sample = {
    timestamp: now,
    novelId: input.novelId,
    chapterNumber: input.chapterNumber,
  };
  const signals = requestSignals(input.request);
  const [subjectSamples, ipSamples] = await Promise.all([
    loadSamples(input.identity.subjectHash, sample),
    loadSamples(`ip-${input.identity.ipHash}`, sample),
  ]);
  const subjectRisk = calculateChapterRisk({
    authenticated: input.identity.authenticated,
    samples: subjectSamples,
    request: signals,
    now,
  });
  const env = getSecurityRuntimeEnv();
  const ipRisk = calculateChapterRisk({
    authenticated: input.identity.authenticated,
    samples: ipSamples,
    request: { nonBrowser: false, knownAutomation: signals.knownAutomation },
    now,
    // A secondary IP window catches clients that rotate the anonymous cookie,
    // while the 10x allowance avoids treating shared NATs as one reader.
    limits: {
      fiveMinutes: (input.identity.authenticated ? env.CHAPTER_RATE_LIMIT_5M : env.CHAPTER_RATE_LIMIT_ANONYMOUS_5M) * 10,
      oneHour: (input.identity.authenticated ? env.CHAPTER_RATE_LIMIT_1H : env.CHAPTER_RATE_LIMIT_ANONYMOUS_1H) * 10,
      sequential: env.SCRAPER_SEQUENTIAL_THRESHOLD,
    },
  });
  return ipRisk.score > subjectRisk.score ? ipRisk : subjectRisk;
}
