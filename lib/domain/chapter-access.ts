export const CHAPTER_ACCESS_MODES = ["free", "paid", "early_access", "members_only"] as const;

export type ChapterAccessMode = (typeof CHAPTER_ACCESS_MODES)[number];
export type PublicAccessMode = "free" | "paid";

export type ChapterAccessDecision =
  | { allowed: true; reason: "FREE" | "PURCHASED" | "MEMBER" | "EARLY_ACCESS_PUBLIC" }
  | {
      allowed: false;
      reason: "PAID_REQUIRED";
      coinPrice: number;
      publicAvailableAt?: Date;
    }
  | {
      allowed: false;
      reason: "MEMBERSHIP_REQUIRED";
      publicAvailableAt?: Date;
    }
  | { allowed: false; reason: "NOT_PUBLISHED" };

export function evaluateChapterAccess(input: {
  isPublished: boolean;
  accessMode: ChapterAccessMode;
  coinPrice: number;
  isPurchased: boolean;
  isActiveMember: boolean;
  now: Date;
  publicAvailableAt?: Date | null;
  publicAccessModeAfterEarlyAccess?: PublicAccessMode | null;
  publicCoinPrice?: number | null;
}): ChapterAccessDecision {
  if (!input.isPublished) return { allowed: false, reason: "NOT_PUBLISHED" };
  if (input.accessMode === "free") return { allowed: true, reason: "FREE" };
  if (input.isPurchased) return { allowed: true, reason: "PURCHASED" };

  if (input.accessMode === "paid") {
    return { allowed: false, reason: "PAID_REQUIRED", coinPrice: input.coinPrice };
  }

  if (input.isActiveMember) return { allowed: true, reason: "MEMBER" };
  if (input.accessMode === "members_only") {
    return { allowed: false, reason: "MEMBERSHIP_REQUIRED" };
  }

  const publicAvailableAt = input.publicAvailableAt ?? undefined;
  if (!publicAvailableAt || input.now < publicAvailableAt) {
    return { allowed: false, reason: "MEMBERSHIP_REQUIRED", publicAvailableAt };
  }
  if (input.publicAccessModeAfterEarlyAccess === "free") {
    return { allowed: true, reason: "EARLY_ACCESS_PUBLIC" };
  }
  return {
    allowed: false,
    reason: "PAID_REQUIRED",
    coinPrice: input.publicCoinPrice ?? 0,
    publicAvailableAt,
  };
}