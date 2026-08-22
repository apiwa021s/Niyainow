import "server-only";

import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { coinPackages, coinWallets, users, writerMembershipPlans, writerProfiles } from "@/db/schema";
import { requireStripeEnv } from "@/lib/env";
import { getStripeClient } from "@/lib/stripe/client";
import { mapStripeSubscriptionStatus, stripeCheckoutUrls } from "@/lib/stripe/domain";
import { ApiError } from "@/lib/http/api-response";
import type { CoinTopupProvider } from "@/services/payment-service";
import type { MembershipBillingProvider } from "@/services/membership-service";

function checkoutUrls(returnUrl: string, fallback: string) {
  const env = requireStripeEnv();
  return stripeCheckoutUrls(env.NEXT_PUBLIC_APP_URL, returnUrl, fallback);
}

export const stripeCoinTopupProvider: CoinTopupProvider = {
  async createCheckout(input) {
    const db = getDb();
    const [[coinPackage], [user], [wallet]] = await Promise.all([
      db.select().from(coinPackages).where(and(eq(coinPackages.id, input.packageId), eq(coinPackages.isActive, true))).limit(1),
      db.select({ email: users.email }).from(users).where(and(eq(users.id, input.userId), eq(users.status, "ACTIVE"))).limit(1),
      db.select({ paidBalance: coinWallets.paidBalance, currency: coinWallets.paidValueCurrency }).from(coinWallets).where(eq(coinWallets.userId, input.userId)).limit(1),
    ]);
    if (!coinPackage) throw new ApiError(404, "COIN_PACKAGE_NOT_FOUND", "ไม่พบแพ็กเกจ Coins นี้");
    if (!user) throw new ApiError(403, "ACCOUNT_DISABLED", "บัญชีนี้ไม่สามารถเติม Coins ได้");
    if (wallet?.paidBalance && wallet.currency && wallet.currency !== coinPackage.currency) {
      throw new ApiError(409, "COIN_WALLET_CURRENCY_CONFLICT", "ไม่สามารถเติม Coins คนละสกุลเงินในกระเป๋าเดียวกัน");
    }
    const urls = checkoutUrls(input.returnUrl, "/wallet");
    const metadata = {
      kind: "coin_topup",
      userId: input.userId,
      packageId: coinPackage.id,
      coinAmount: String(coinPackage.coinAmount),
      bonusCoinAmount: String(coinPackage.bonusCoinAmount),
      priceMinor: String(coinPackage.priceMinor),
      currency: coinPackage.currency,
    };
    const session = await getStripeClient().checkout.sessions.create({
      mode: "payment",
      client_reference_id: input.userId,
      customer_email: user.email,
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      metadata,
      payment_intent_data: { metadata },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: coinPackage.currency.toLowerCase(),
          unit_amount: coinPackage.priceMinor,
          product_data: { name: `${coinPackage.coinAmount} NovelNow Coins` },
        },
      }],
    }, { idempotencyKey: `coin-checkout:${input.userId}:${input.idempotencyKey}` });
    if (!session.url) throw new Error("stripe_checkout_url_missing");
    return { redirectUrl: session.url };
  },
  async handleWebhook(request) {
    const { handleStripeWebhook } = await import("@/services/stripe-webhook-service");
    await handleStripeWebhook(request);
  },
};

export const stripeMembershipBillingProvider: MembershipBillingProvider = {
  async subscribe(input) {
    const db = getDb();
    const [[plan], [user]] = await Promise.all([
      db.select({
        id: writerMembershipPlans.id,
        writerId: writerMembershipPlans.writerId,
        name: writerMembershipPlans.name,
        priceMinor: writerMembershipPlans.priceMinor,
        currency: writerMembershipPlans.currency,
        writerDisplayName: writerProfiles.displayName,
      }).from(writerMembershipPlans).innerJoin(writerProfiles, eq(writerProfiles.id, writerMembershipPlans.writerId))
        .where(and(eq(writerMembershipPlans.id, input.planId), eq(writerMembershipPlans.status, "ACTIVE"), eq(writerProfiles.status, "ACTIVE"))).limit(1),
      db.select({ email: users.email }).from(users).where(and(eq(users.id, input.readerId), eq(users.status, "ACTIVE"))).limit(1),
    ]);
    if (!plan) throw new ApiError(404, "MEMBERSHIP_PLAN_NOT_FOUND", "ไม่พบ Membership plan นี้");
    if (!user) throw new ApiError(403, "ACCOUNT_DISABLED", "บัญชีนี้ไม่สามารถสมัคร Membership ได้");
    const urls = checkoutUrls(input.returnUrl, `/writers/${plan.writerId}/membership`);
    const metadata = {
      kind: "writer_membership",
      readerId: input.readerId,
      writerId: plan.writerId,
      membershipPlanId: plan.id,
    };
    const session = await getStripeClient().checkout.sessions.create({
      mode: "subscription",
      client_reference_id: input.readerId,
      customer_email: user.email,
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      metadata,
      subscription_data: { metadata },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: plan.currency.toLowerCase(),
          unit_amount: plan.priceMinor,
          recurring: { interval: "month" },
          product_data: { name: `${plan.writerDisplayName} Membership` },
        },
      }],
    }, { idempotencyKey: `membership-checkout:${input.readerId}:${input.idempotencyKey}` });
    if (!session.url) throw new Error("stripe_checkout_url_missing");
    return { redirectUrl: session.url };
  },
  async cancel(input) {
    await getStripeClient().subscriptions.update(input.providerSubscriptionId, {
      cancel_at_period_end: input.atPeriodEnd,
    });
  },
  async getStatus(providerSubscriptionId) {
    const subscription = await getStripeClient().subscriptions.retrieve(providerSubscriptionId);
    return mapStripeSubscriptionStatus(subscription.status, subscription.cancel_at_period_end);
  },
  async handleWebhook(request) {
    const { handleStripeWebhook } = await import("@/services/stripe-webhook-service");
    await handleStripeWebhook(request);
  },
};