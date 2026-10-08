import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cacheKeys } from "@/lib/redis/keys";
import { getActiveBanners } from "@/services/novel-service";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  read: vi.fn(),
  getOrSet: vi.fn(),
  cachedFunctions: [] as Array<{ keys: string[]; options: { revalidate?: number; tags?: string[] } }>,
}));

vi.mock("@/db", () => ({ getDb: () => ({ select: mocks.select }) }));
vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown, keys: string[], options: { revalidate?: number; tags?: string[] }) => {
    mocks.cachedFunctions.push({ keys, options });
    return callback;
  },
}));
vi.mock("@/lib/redis/cache", () => ({
  applicationCache: {
    version: vi.fn(async () => 0),
    getOrSet: mocks.getOrSet,
  },
}));
vi.mock("@/lib/logger", () => ({ logger: { child: () => ({ warn: vi.fn() }) } }));

const banner = {
  id: "banner-1",
  title: "Featured story",
  subtitle: "Read the latest chapter",
  imageKey: null,
  linkUrl: "/novels/featured-story",
  ctaLabel: "Read now",
};

function queryError(code: string) {
  return new Error("Failed query", { cause: Object.assign(new Error("Database unavailable"), { code }) });
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.read.mockReset();
  mocks.select.mockReset().mockImplementation(() => {
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: mocks.read,
    };
    return query;
  });
  mocks.getOrSet.mockReset().mockImplementation(async ({ loader }: { loader: () => Promise<unknown> }) => loader());
});

afterEach(() => {
  vi.useRealTimers();
});

describe("public banner database read resilience", () => {
  it("retries a connection timeout and preserves the successful banner payload", async () => {
    mocks.read.mockRejectedValueOnce(queryError("CONNECT_TIMEOUT")).mockResolvedValueOnce([banner]);

    const result = getActiveBanners(6);
    const assertion = expect(result).resolves.toEqual([{
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle,
      image: "/fallback-backdrop.svg",
      linkUrl: banner.linkUrl,
      ctaLabel: banner.ctaLabel,
    }]);
    await vi.runAllTimersAsync();
    await assertion;

    expect(mocks.select).toHaveBeenCalledTimes(2);
    expect(mocks.read).toHaveBeenNthCalledWith(1, 6);
    expect(mocks.read).toHaveBeenNthCalledWith(2, 6);
    expect(mocks.getOrSet).toHaveBeenCalledTimes(1);
    expect(mocks.getOrSet).toHaveBeenCalledWith(expect.objectContaining({
      key: cacheKeys.banner(6, 0), ttlSeconds: 60, category: "banner",
    }));
  });

  it("propagates a persistent timeout instead of replacing cached banners with an empty success", async () => {
    const error = queryError("CONNECT_TIMEOUT");
    mocks.read.mockRejectedValue(error);

    const result = getActiveBanners(6);
    const assertion = expect(result).rejects.toBe(error);
    await vi.runAllTimersAsync();
    await assertion;

    expect(mocks.select).toHaveBeenCalledTimes(2);
    expect(mocks.getOrSet).toHaveBeenCalledTimes(1);
  });

  it.each(["42601", "28P01"])("does not retry database error %s", async (code) => {
    const error = queryError(code);
    mocks.read.mockRejectedValue(error);

    await expect(getActiveBanners(6)).rejects.toBe(error);

    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps the existing Next cache tag and revalidation interval", () => {
    expect(mocks.cachedFunctions.find(({ keys }) => keys.includes("public-banners-v2"))).toEqual({
      keys: ["public-banners-v2"],
      options: { revalidate: 60, tags: ["public-banners"] },
    });
  });
});
