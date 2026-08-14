import { describe, expect, it } from "vitest";

import {
  membershipCountDelta,
  publishedReviewCountDelta,
  ratingAggregateDelta,
  shouldPersistProgress,
} from "@/services/user-domain";

const updatedAt = new Date("2026-08-14T00:00:00.000Z");
const current = {
  chapterId: "chapter-1",
  progressPercent: 25,
  position: 1_000,
  completed: false,
  updatedAt,
};

describe("shouldPersistProgress", () => {
  it("persists the first reading position", () => {
    expect(
      shouldPersistProgress(
        null,
        { chapterId: "chapter-1", progressPercent: 1, position: 10, completed: false },
        updatedAt,
      ),
    ).toBe(true);
  });

  it("persists chapter transitions and completion immediately", () => {
    expect(
      shouldPersistProgress(
        current,
        { ...current, chapterId: "chapter-2" },
        new Date(updatedAt.getTime() + 500),
      ),
    ).toBe(true);
    expect(
      shouldPersistProgress(
        current,
        { ...current, completed: true },
        new Date(updatedAt.getTime() + 500),
      ),
    ).toBe(true);
  });

  it("drops noisy scroll events inside the write window", () => {
    expect(
      shouldPersistProgress(
        current,
        { ...current, progressPercent: 25.5, position: 1_100 },
        new Date(updatedAt.getTime() + 2_000),
      ),
    ).toBe(false);
  });

  it("rejects an out-of-order request that is older than the stored snapshot", () => {
    expect(
      shouldPersistProgress(
        current,
        { ...current, chapterId: "chapter-2", completed: true },
        new Date(updatedAt.getTime() - 1),
      ),
    ).toBe(false);
  });

  it("persists meaningful movement or a heartbeat after the window", () => {
    expect(
      shouldPersistProgress(
        current,
        { ...current, progressPercent: 27, position: 1_100 },
        new Date(updatedAt.getTime() + 2_000),
      ),
    ).toBe(true);
    expect(
      shouldPersistProgress(
        current,
        { ...current, progressPercent: 25.5, position: 1_100 },
        new Date(updatedAt.getTime() + 8_000),
      ),
    ).toBe(true);
  });
});

describe("engagement aggregate deltas", () => {
  it("changes membership counters only when membership changes", () => {
    expect(membershipCountDelta(false, true)).toBe(1);
    expect(membershipCountDelta(true, true)).toBe(0);
    expect(membershipCountDelta(true, false)).toBe(-1);
  });

  it("derives rating count and sum changes from the one user row", () => {
    expect(ratingAggregateDelta(null, 5)).toEqual({ count: 1, sum: 5 });
    expect(ratingAggregateDelta(5, 3)).toEqual({ count: 0, sum: -2 });
    expect(ratingAggregateDelta(3, null)).toEqual({ count: -1, sum: -3 });
  });

  it("counts only live published review transitions", () => {
    const live = { status: "PUBLISHED", deletedAt: null };
    const pending = { status: "PENDING", deletedAt: null };
    expect(publishedReviewCountDelta(pending, live)).toBe(1);
    expect(publishedReviewCountDelta(live, pending)).toBe(-1);
    expect(publishedReviewCountDelta(live, { status: "HIDDEN", deletedAt: new Date() })).toBe(-1);
  });
});
