import { describe, expect, it } from "vitest";

import { evaluateChapterAccess } from "@/lib/domain/chapter-access";

const now = new Date("2026-08-22T12:00:00.000Z");

describe("evaluateChapterAccess", () => {
  it("rejects unpublished chapters before evaluating entitlements", () => {
    expect(evaluateChapterAccess({
      isPublished: false,
      accessMode: "free",
      coinPrice: 0,
      isPurchased: true,
      isActiveMember: true,
      now,
    })).toEqual({ allowed: false, reason: "NOT_PUBLISHED" });
  });

  it("allows free and purchased paid chapters", () => {
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "free",
      coinPrice: 0,
      isPurchased: false,
      isActiveMember: false,
      now,
    })).toEqual({ allowed: true, reason: "FREE" });
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "paid",
      coinPrice: 3,
      isPurchased: true,
      isActiveMember: false,
      now,
    })).toEqual({ allowed: true, reason: "PURCHASED" });
  });

  it("requires payment for an unpurchased paid chapter", () => {
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "paid",
      coinPrice: 3,
      isPurchased: false,
      isActiveMember: false,
      now,
    })).toEqual({ allowed: false, reason: "PAID_REQUIRED", coinPrice: 3 });
  });

  it("allows an active member during early access", () => {
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "early_access",
      coinPrice: 0,
      isPurchased: false,
      isActiveMember: true,
      now,
      publicAvailableAt: new Date("2026-08-24T12:00:00.000Z"),
      publicAccessModeAfterEarlyAccess: "paid",
      publicCoinPrice: 3,
    })).toEqual({ allowed: true, reason: "MEMBER" });
  });

  it("returns the public date to a non-member during early access", () => {
    const publicAvailableAt = new Date("2026-08-24T12:00:00.000Z");
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "early_access",
      coinPrice: 0,
      isPurchased: false,
      isActiveMember: false,
      now,
      publicAvailableAt,
      publicAccessModeAfterEarlyAccess: "free",
    })).toEqual({ allowed: false, reason: "MEMBERSHIP_REQUIRED", publicAvailableAt });
  });

  it("applies the configured public access after early access ends", () => {
    const publicAvailableAt = new Date("2026-08-20T12:00:00.000Z");
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "early_access",
      coinPrice: 0,
      isPurchased: false,
      isActiveMember: false,
      now,
      publicAvailableAt,
      publicAccessModeAfterEarlyAccess: "free",
    })).toEqual({ allowed: true, reason: "EARLY_ACCESS_PUBLIC" });
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "early_access",
      coinPrice: 0,
      isPurchased: false,
      isActiveMember: false,
      now,
      publicAvailableAt,
      publicAccessModeAfterEarlyAccess: "paid",
      publicCoinPrice: 3,
    })).toEqual({ allowed: false, reason: "PAID_REQUIRED", coinPrice: 3, publicAvailableAt });
  });

  it("keeps member-only chapters private without a public countdown", () => {
    expect(evaluateChapterAccess({
      isPublished: true,
      accessMode: "members_only",
      coinPrice: 0,
      isPurchased: false,
      isActiveMember: false,
      now,
    })).toEqual({ allowed: false, reason: "MEMBERSHIP_REQUIRED" });
  });
});