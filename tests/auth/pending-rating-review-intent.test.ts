import { describe, expect, it } from "vitest";

import {
  createPendingRatingReviewIntent,
  parsePendingRatingReviewIntent,
  PENDING_RATING_REVIEW_INTENT_KEY,
  PENDING_RATING_REVIEW_INTENT_MAX_LENGTH,
  PENDING_RATING_REVIEW_INTENT_TTL_MS,
  readPendingRatingReviewIntent,
  serializePendingRatingReviewIntent,
  storePendingRatingReviewIntent,
} from "@/lib/auth/pending-rating-review-intent";

const NOW = 2_000_000_000_000;

describe("pending rating and review intents", () => {
  it("round-trips a bounded explicit rating together with an unfinished draft", () => {
    const intent = createPendingRatingReviewIntent({
      slug: "the-last-orchid",
      action: "rating",
      score: 5,
      title: "ฉบับร่าง",
      body: "ยังเขียนไม่เสร็จ",
      isSpoiler: false,
      createdAt: NOW,
    });

    expect(intent).not.toBeNull();
    const serialized = serializePendingRatingReviewIntent(intent!);
    expect(serialized).not.toBeNull();
    expect(parsePendingRatingReviewIntent(serialized!, NOW)).toEqual(intent);
  });

  it("allows drafts below the publish minimum but rejects an explicit short review", () => {
    expect(createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "draft",
      title: "",
      body: "สั้น",
      isSpoiler: false,
      createdAt: NOW,
    })).not.toBeNull();

    expect(createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "review",
      title: "",
      body: "สั้น",
      isSpoiler: false,
      createdAt: NOW,
    })).toBeNull();

    expect(createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "delete-review",
      title: "รีวิวเดิม",
      body: "",
      isSpoiler: false,
      createdAt: NOW,
    })?.action).toBe("delete-review");
  });

  it("rejects stale, far-future, malformed, and oversized stored values", () => {
    const valid = createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "draft",
      title: "",
      body: "ฉบับร่าง",
      isSpoiler: true,
      createdAt: NOW,
    });
    const serialized = serializePendingRatingReviewIntent(valid!)!;

    expect(parsePendingRatingReviewIntent(serialized, NOW + PENDING_RATING_REVIEW_INTENT_TTL_MS + 1)).toBeNull();
    expect(parsePendingRatingReviewIntent(serialized, NOW - 60_001)).toBeNull();
    expect(parsePendingRatingReviewIntent("{not-json", NOW)).toBeNull();
    expect(parsePendingRatingReviewIntent("x".repeat(PENDING_RATING_REVIEW_INTENT_MAX_LENGTH + 1), NOW)).toBeNull();
  });

  it("rejects unsafe slugs, invalid scores, and fields beyond API limits", () => {
    expect(createPendingRatingReviewIntent({
      slug: "../other",
      action: "rating",
      score: 5,
      title: "",
      body: "",
      isSpoiler: false,
      createdAt: NOW,
    })).toBeNull();
    expect(createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "rating",
      score: 6,
      title: "",
      body: "",
      isSpoiler: false,
      createdAt: NOW,
    })).toBeNull();
    expect(createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "draft",
      title: "x".repeat(201),
      body: "",
      isSpoiler: false,
      createdAt: NOW,
    })).toBeNull();
    expect(createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "draft",
      title: "",
      body: "x".repeat(5_001),
      isSpoiler: false,
      createdAt: NOW,
    })).toBeNull();
  });

  it("claims an explicit action once before returning it", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => { values.delete(key); },
    };
    const intent = createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "rating",
      score: 4,
      title: "",
      body: "",
      isSpoiler: false,
    })!;

    expect(storePendingRatingReviewIntent(storage, intent)).toBe(true);
    expect(readPendingRatingReviewIntent(storage, "quiet-moon", true)).toEqual(intent);
    expect(readPendingRatingReviewIntent(storage, "quiet-moon", true)).toBeNull();
  });

  it("does not replay when storage cannot atomically remove the claim", () => {
    const intent = createPendingRatingReviewIntent({
      slug: "quiet-moon",
      action: "review",
      title: "พร้อมส่ง",
      body: "รีวิวฉบับนี้มีความยาวเกินยี่สิบตัวอักษรแล้ว",
      isSpoiler: false,
    })!;
    const raw = serializePendingRatingReviewIntent(intent)!;
    const storage = {
      getItem: (key: string) => key === PENDING_RATING_REVIEW_INTENT_KEY ? raw : null,
      setItem: () => undefined,
      removeItem: () => { throw new Error("blocked"); },
    };

    expect(readPendingRatingReviewIntent(storage, "quiet-moon", true)).toBeNull();
  });
});
