import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCronEnv: vi.fn(),
  invalidateChapterCache: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ requireCronEnv: mocks.requireCronEnv }));
vi.mock("@/lib/redis/invalidation", () => ({ invalidateChapterCache: mocks.invalidateChapterCache }));
vi.mock("@/lib/logger", () => ({ logger: { child: () => ({ warn: mocks.warn }) } }));

import {
  invalidatePublishedTranslationCache,
  invalidatePublishedTranslationCacheAfterCommit,
} from "@/services/translation-publication-cache";

const secret = "internal-revalidation-secret-at-least-32-characters";
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireCronEnv.mockReturnValue({ NEXT_PUBLIC_APP_URL: "https://example.com", CRON_SECRET: secret });
  mocks.invalidateChapterCache.mockResolvedValue(undefined);
  fetchMock.mockReset().mockResolvedValue(Response.json({ data: { invalidated: true } }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe("translation publication cache", () => {
  it("invalidates Redis and authenticates a bounded Next revalidation without following redirects", async () => {
    await expect(invalidatePublishedTranslationCacheAfterCommit([
      { novelSlug: "sample-novel" }, { novelSlug: "sample-novel" },
    ])).resolves.toEqual({ invalidated: true });

    expect(mocks.invalidateChapterCache).toHaveBeenCalledExactlyOnceWith("sample-novel");
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(
      new URL("https://example.com/api/internal/translation-revalidate"),
      expect.objectContaining({
        method: "POST",
        headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
        body: JSON.stringify({ novelSlugs: ["sample-novel"] }),
        cache: "no-store",
        redirect: "error",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("never throws after publication when the Next bridge fails or leaks request details into logs", async () => {
    fetchMock.mockRejectedValue(new Error(`request Authorization: Bearer ${secret} failed`));
    await expect(invalidatePublishedTranslationCacheAfterCommit([{ novelSlug: "sample-novel" }]))
      .resolves.toEqual({ invalidated: false });
    expect(mocks.warn).toHaveBeenCalledWith(expect.any(String), {
      novelCount: 1, code: "REVALIDATION_REQUEST_FAILED",
    });
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain(secret);
  });

  it("keeps application cache failures out of the translation retry path", async () => {
    mocks.invalidateChapterCache.mockRejectedValue(new Error("Redis unavailable"));
    await expect(invalidatePublishedTranslationCacheAfterCommit([{ novelSlug: "sample-novel" }]))
      .resolves.toEqual({ invalidated: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("leaves a failed bridge retryable by the outbox and rejects unrelated successful responses", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ data: {} }));
    await expect(invalidatePublishedTranslationCache([{ novelSlug: "sample-novel" }]))
      .rejects.toThrow("REVALIDATION_INVALID_RESPONSE");
    fetchMock.mockResolvedValueOnce(Response.json({ error: "unauthorized" }, { status: 401 }));
    await expect(invalidatePublishedTranslationCache([{ novelSlug: "sample-novel" }]))
      .rejects.toThrow("REVALIDATION_REJECTED");
  });

  it("invalidates Redis even when bridge configuration is unavailable", async () => {
    mocks.requireCronEnv.mockReturnValue({ CRON_SECRET: secret });
    await expect(invalidatePublishedTranslationCacheAfterCommit([{ novelSlug: "sample-novel" }]))
      .resolves.toEqual({ invalidated: false });
    expect(mocks.invalidateChapterCache).toHaveBeenCalledWith("sample-novel");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips empty batches", async () => {
    await expect(invalidatePublishedTranslationCacheAfterCommit([])).resolves.toEqual({ invalidated: true });
    expect(mocks.invalidateChapterCache).not.toHaveBeenCalled();
    expect(mocks.requireCronEnv).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
