import { safeRedirectPath } from "@/lib/auth/redirects";

export type LocalMembershipStatus = "active" | "cancel_at_period_end" | "expired" | "past_due" | "cancelled";

export function stripeCheckoutUrls(appUrlValue: string, returnUrl: string, fallback: string) {
  const appUrl = new URL(appUrlValue);
  let candidate = returnUrl;
  try {
    const parsed = new URL(returnUrl, appUrl);
    candidate = parsed.origin === appUrl.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : fallback;
  } catch {
    candidate = fallback;
  }
  const safePath = safeRedirectPath(candidate, fallback);
  const success = new URL(safePath, appUrl);
  success.searchParams.set("checkout", "success");
  success.searchParams.set("session_id", "{CHECKOUT_SESSION_ID}");
  const cancel = new URL(safePath, appUrl);
  cancel.searchParams.set("checkout", "cancelled");
  return { successUrl: success.toString(), cancelUrl: cancel.toString() };
}

export function mapStripeSubscriptionStatus(
  status: string,
  cancelAtPeriodEnd: boolean,
): LocalMembershipStatus {
  if (status === "active" || status === "trialing") {
    return cancelAtPeriodEnd ? "cancel_at_period_end" : "active";
  }
  if (status === "past_due" || status === "unpaid" || status === "incomplete" || status === "paused") {
    return "past_due";
  }
  if (status === "canceled") return "cancelled";
  return "expired";
}

export function stripeTimestamp(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError("invalid_stripe_timestamp");
  return new Date(value * 1_000);
}

export function requireStripeMetadata(
  metadata: Record<string, string> | null | undefined,
  keys: readonly string[],
) {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = metadata?.[key]?.trim();
    if (!value) throw new Error(`stripe_metadata_missing:${key}`);
    result[key] = value;
  }
  return result;
}