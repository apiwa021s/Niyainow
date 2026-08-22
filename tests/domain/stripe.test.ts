import { describe, expect, it } from "vitest";

import { mapStripeSubscriptionStatus, requireStripeMetadata, stripeCheckoutUrls, stripeTimestamp } from "@/lib/stripe/domain";

describe("Stripe domain mapping", () => {
  it("maps provider states to local entitlement states", () => {
    expect(mapStripeSubscriptionStatus("active", false)).toBe("active");
    expect(mapStripeSubscriptionStatus("active", true)).toBe("cancel_at_period_end");
    expect(mapStripeSubscriptionStatus("past_due", false)).toBe("past_due");
    expect(mapStripeSubscriptionStatus("canceled", false)).toBe("cancelled");
    expect(mapStripeSubscriptionStatus("incomplete_expired", false)).toBe("expired");
  });

  it("validates metadata and timestamps before financial mutations", () => {
    expect(requireStripeMetadata({ userId: "user-1" }, ["userId"])).toEqual({ userId: "user-1" });
    expect(() => requireStripeMetadata({}, ["userId"])).toThrow("stripe_metadata_missing:userId");
    expect(stripeTimestamp(1_700_000_000).toISOString()).toBe("2023-11-14T22:13:20.000Z");
  });

  it("keeps Checkout redirects on the configured application origin", () => {
    const accepted = stripeCheckoutUrls("https://novel.example", "/wallet?tab=coins", "/wallet");
    expect(accepted.successUrl).toContain("https://novel.example/wallet?tab=coins&checkout=success");
    const rejected = stripeCheckoutUrls("https://novel.example", "https://evil.example/steal", "/wallet");
    expect(rejected.successUrl).toContain("https://novel.example/wallet?checkout=success");
    expect(rejected.successUrl).not.toContain("evil.example");
  });
});