import "server-only";

import { z } from "zod";

import { requireCronEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { invalidateChapterCache } from "@/lib/redis/invalidation";
import { slugSchema } from "@/lib/validation/slug";

export const translationPublicationRevalidationSchema = z.object({
  novelSlugs: z.array(slugSchema).min(1).max(100),
}).strict();

const cacheLogger = logger.child({ component: "translation-publication-cache" });
const REVALIDATION_TIMEOUT_MS = 5_000;

class TranslationPublicationCacheError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = "TranslationPublicationCacheError";
  }
}

/** Throws on failure so the publication outbox can retry independently of AI work. */
export async function invalidatePublishedTranslationCache(results: Array<{ novelSlug: string }>) {
  const novelSlugs = [...new Set(results.map((result) => result.novelSlug))];
  if (!novelSlugs.length) return;
  const payload = translationPublicationRevalidationSchema.parse({ novelSlugs });

  try {
    for (const novelSlug of novelSlugs) await invalidateChapterCache(novelSlug);
  } catch {
    throw new TranslationPublicationCacheError("APPLICATION_CACHE_INVALIDATION_FAILED");
  }

  let endpoint: URL;
  let secret: string;
  try {
    const env = requireCronEnv();
    if (!env.NEXT_PUBLIC_APP_URL) throw new Error("missing_app_url");
    endpoint = new URL("/api/internal/translation-revalidate", env.NEXT_PUBLIC_APP_URL);
    secret = env.CRON_SECRET;
  } catch {
    throw new TranslationPublicationCacheError("REVALIDATION_NOT_CONFIGURED");
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      // An unexpected redirect must never forward the internal credential.
      redirect: "error",
      signal: AbortSignal.timeout(REVALIDATION_TIMEOUT_MS),
    });
    if (!response.ok) throw new TranslationPublicationCacheError("REVALIDATION_REJECTED");
    const result: unknown = await response.json();
    if (!result || typeof result !== "object" || !("data" in result)
      || !result.data || typeof result.data !== "object" || !("invalidated" in result.data)
      || result.data.invalidated !== true) {
      throw new TranslationPublicationCacheError("REVALIDATION_INVALID_RESPONSE");
    }
  } catch (error) {
    if (error instanceof TranslationPublicationCacheError) throw error;
    throw new TranslationPublicationCacheError("REVALIDATION_REQUEST_FAILED");
  }
}

/** A committed chapter must never be requeued for translation because its cache failed. */
export async function invalidatePublishedTranslationCacheAfterCommit(results: Array<{ novelSlug: string }>) {
  try {
    await invalidatePublishedTranslationCache(results);
    return { invalidated: true };
  } catch (error) {
    // The chapter_published outbox retains a durable retry; do not log fetch
    // errors or request details, which can contain the internal credential.
    cacheLogger.warn("Published translation cache will be retried by the outbox", {
      novelCount: new Set(results.map((result) => result.novelSlug)).size,
      code: error instanceof TranslationPublicationCacheError ? error.code : "APPLICATION_CACHE_INVALIDATION_FAILED",
    });
    return { invalidated: false };
  }
}
