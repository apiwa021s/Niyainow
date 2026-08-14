import { describe, expect, it } from "vitest";

import { isExpiredMediaCleanupCandidate } from "./cleanup";

const cutoff = new Date("2026-08-14T00:00:00.000Z");
const old = new Date("2026-08-13T00:00:00.000Z");
const recent = new Date("2026-08-14T01:00:00.000Z");

describe("media cleanup policy", () => {
  it("expires abandoned pending and failed records", () => {
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "PENDING", createdAt: old, updatedAt: old, deletedAt: null, stagingKey: "staging/key" },
        cutoff,
      ),
    ).toBe(true);
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "FAILED", createdAt: old, updatedAt: old, deletedAt: null, stagingKey: null },
        cutoff,
      ),
    ).toBe(true);
  });

  it("preserves active READY media but removes an old leftover staging copy", () => {
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "READY", createdAt: old, updatedAt: old, deletedAt: null, stagingKey: null },
        cutoff,
      ),
    ).toBe(false);
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "READY", createdAt: old, updatedAt: old, deletedAt: null, stagingKey: "staging/key" },
        cutoff,
      ),
    ).toBe(true);
  });

  it("reclaims only stale VERIFYING claims by their heartbeat timestamp", () => {
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "VERIFYING", createdAt: old, updatedAt: old, deletedAt: null, stagingKey: "staging/key" },
        cutoff,
      ),
    ).toBe(true);
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "VERIFYING", createdAt: old, updatedAt: recent, deletedAt: null, stagingKey: "staging/key" },
        cutoff,
      ),
    ).toBe(false);
  });

  it("uses the explicit deletion time and keeps recent pending records", () => {
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "READY", createdAt: old, updatedAt: recent, deletedAt: old, stagingKey: null },
        cutoff,
      ),
    ).toBe(true);
    expect(
      isExpiredMediaCleanupCandidate(
        { status: "PENDING", createdAt: recent, updatedAt: recent, deletedAt: null, stagingKey: "staging/key" },
        cutoff,
      ),
    ).toBe(false);
  });
});
