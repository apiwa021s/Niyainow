import { describe, expect, it } from "vitest";

import { takeRateLimit } from "@/lib/security/rate-limit";

describe("takeRateLimit", () => {
  it("blocks requests beyond a fixed window limit", () => {
    const key = `test:${crypto.randomUUID()}`;
    expect(takeRateLimit(key, { limit: 2, windowMs: 1_000, now: 100 }).allowed).toBe(true);
    expect(takeRateLimit(key, { limit: 2, windowMs: 1_000, now: 101 }).allowed).toBe(true);
    expect(takeRateLimit(key, { limit: 2, windowMs: 1_000, now: 102 }).allowed).toBe(false);
  });

  it("opens a new window after expiry", () => {
    const key = `test:${crypto.randomUUID()}`;
    takeRateLimit(key, { limit: 1, windowMs: 100, now: 100 });
    expect(takeRateLimit(key, { limit: 1, windowMs: 100, now: 200 }).allowed).toBe(true);
  });
});
