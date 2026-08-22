import { loadEnvConfig } from "@next/env";
import { and, eq, sql } from "drizzle-orm";
import Stripe from "stripe";

import { closeDbConnection, getDb } from "./index";
import {
  coinLedgerEntries,
  coinPackages,
  coinWallets,
  creatorLedgerEntries,
  creatorRevenueContracts,
  creatorRevenueEvents,
  notifications,
  readerMemberships,
  users,
  writerMembershipPlans,
  writerProfiles,
} from "./schema";
import { handleStripeWebhook } from "../services/stripe-webhook-service";

loadEnvConfig(process.cwd());
const webhookSecret = "whsec_verify_stripe_backend";
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000";
process.env.STRIPE_SECRET_KEY = "sk_test_verify_stripe_backend";
process.env.STRIPE_WEBHOOK_SECRET = webhookSecret;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`stripe_backend_verification_failed:${message}`);
}

async function deliverSignedEvent(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  return handleStripeWebhook(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: { "stripe-signature": signature, "content-type": "application/json" },
    body: payload,
  }));
}

function event(id: string, type: string, object: Record<string, unknown>) {
  return {
    id,
    object: "event",
    api_version: null,
    created: 1_700_000_000,
    data: { object },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  };
}

async function verifyStripeBackend() {
  const db = getDb();
  const suffix = crypto.randomUUID();
  const stripeSessionId = `cs_test_${suffix}`;
  const stripeSubscriptionId = `sub_test_${suffix}`;
  const stripeInvoiceId = `in_test_${suffix}`;
  let userId: string | undefined;
  let writerId: string | undefined;
  let planId: string | undefined;
  let packageId: string | undefined;

  try {
    const [user] = await db.insert(users).values({ email: `stripe-${suffix}@example.invalid`, name: "Stripe Verify" }).returning({ id: users.id });
    assert(user, "user_not_created");
    userId = user.id;
    const [writer] = await db.insert(writerProfiles).values({ userId, username: `stripe-${suffix}`, displayName: "Stripe Verify" }).returning({ id: writerProfiles.id });
    assert(writer, "writer_not_created");
    writerId = writer.id;
    await db.insert(creatorRevenueContracts).values({
      writerId,
      type: "standard",
      creatorShareBasisPoints: 8_500,
      platformShareBasisPoints: 1_500,
      effectiveFrom: new Date("2023-01-01T00:00:00.000Z"),
      status: "ACTIVE",
    });
    const [plan] = await db.insert(writerMembershipPlans).values({
      writerId,
      name: "Stripe Verification Membership",
      priceMinor: 9_900,
      currency: "THB",
      status: "ACTIVE",
    }).returning({ id: writerMembershipPlans.id });
    assert(plan, "plan_not_created");
    planId = plan.id;
    const [coinPackage] = await db.insert(coinPackages).values({
      coinAmount: 10,
      bonusCoinAmount: 2,
      priceMinor: 1_000,
      currency: "THB",
      isActive: true,
      sortOrder: 999,
    }).returning({ id: coinPackages.id });
    assert(coinPackage, "coin_package_not_created");
    packageId = coinPackage.id;

    const coinEvent = event(`evt_coin_${suffix}`, "checkout.session.completed", {
      id: stripeSessionId,
      object: "checkout.session",
      mode: "payment",
      client_reference_id: userId,
      payment_status: "paid",
      amount_total: 1_000,
      currency: "thb",
      metadata: {
        kind: "coin_topup",
        userId,
        packageId,
        coinAmount: "10",
        bonusCoinAmount: "2",
        priceMinor: "1000",
        currency: "THB",
      },
    });
    await deliverSignedEvent(coinEvent);
    await deliverSignedEvent(coinEvent);
    const [wallet, topupLedgers, coinNotifications] = await Promise.all([
      db.select().from(coinWallets).where(eq(coinWallets.userId, userId)).limit(1),
      db.select({ count: sql<number>`count(*)::int` }).from(coinLedgerEntries).where(eq(coinLedgerEntries.userId, userId)),
      db.select({ count: sql<number>`count(*)::int` }).from(notifications).where(and(eq(notifications.userId, userId), eq(notifications.dedupeKey, `stripe-coin-topup:${stripeSessionId}`))),
    ]);
    assert(wallet[0]?.balance === 12 && wallet[0].paidBalance === 10 && wallet[0].bonusBalance === 2, "coin_wallet_credit");
    assert(wallet[0]?.paidValueMinor === 1_000 && wallet[0].paidValueCurrency === "THB", "coin_paid_value");
    assert(topupLedgers[0]?.count === 2, "coin_webhook_idempotency");
    assert(coinNotifications[0]?.count === 1, "coin_notification_idempotency");

    const periodStart = 1_700_000_000;
    const periodEnd = 1_702_592_000;
    const membershipMetadata = { kind: "writer_membership", readerId: userId, writerId, membershipPlanId: planId };
    const subscriptionEvent = event(`evt_subscription_${suffix}`, "customer.subscription.updated", {
      id: stripeSubscriptionId,
      object: "subscription",
      status: "active",
      cancel_at_period_end: false,
      metadata: membershipMetadata,
      items: {
        object: "list",
        data: [{ id: `si_${suffix}`, current_period_start: periodStart, current_period_end: periodEnd }],
        has_more: false,
        url: "/v1/subscription_items",
      },
    });
    await deliverSignedEvent(subscriptionEvent);
    await deliverSignedEvent(subscriptionEvent);
    const [memberships] = await db.select({ count: sql<number>`count(*)::int` }).from(readerMemberships)
      .where(and(eq(readerMemberships.provider, "stripe"), eq(readerMemberships.providerSubscriptionId, stripeSubscriptionId)));
    assert(memberships?.count === 1, "subscription_webhook_idempotency");

    const invoiceEvent = event(`evt_invoice_${suffix}`, "invoice.paid", {
      id: stripeInvoiceId,
      object: "invoice",
      amount_paid: 9_900,
      currency: "thb",
      status: "paid",
      created: 1_700_000_000,
      status_transitions: { paid_at: 1_700_000_000 },
      parent: {
        type: "subscription_details",
        quote_details: null,
        subscription_details: { subscription: stripeSubscriptionId, metadata: membershipMetadata },
      },
    });
    await deliverSignedEvent(invoiceEvent);
    await deliverSignedEvent(invoiceEvent);
    const [membershipRevenue, membershipLedger] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(creatorRevenueEvents).where(and(eq(creatorRevenueEvents.writerId, writerId), eq(creatorRevenueEvents.sourceType, "membership_subscription"))),
      db.select({ count: sql<number>`count(*)::int`, amount: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int` }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.referenceId, `stripe-invoice:${stripeInvoiceId}`)),
    ]);
    assert(membershipRevenue[0]?.count === 1, "membership_revenue_event_idempotency");
    assert(membershipLedger[0]?.count === 1 && membershipLedger[0].amount === 8_415, "membership_revenue_ledger");

    const partialCreditNoteId = `cn_partial_${suffix}`;
    const partialCreditNote = event(`evt_credit_partial_${suffix}`, "credit_note.created", {
      id: partialCreditNoteId,
      object: "credit_note",
      status: "issued",
      post_payment_amount: 1_000,
      currency: "thb",
      created: 1_700_000_100,
      effective_at: 1_700_000_100,
      invoice: {
        id: stripeInvoiceId,
        object: "invoice",
        parent: { type: "subscription_details", quote_details: null, subscription_details: { subscription: stripeSubscriptionId, metadata: membershipMetadata } },
      },
    });
    await deliverSignedEvent(partialCreditNote);
    await deliverSignedEvent(partialCreditNote);
    const [partialReversals, partialNet] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(creatorRevenueEvents).where(eq(creatorRevenueEvents.externalReference, `stripe-credit-note:${partialCreditNoteId}`)),
      db.select({ amount: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int` }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.writerId, writerId)),
    ]);
    assert(partialReversals[0]?.count === 1, "partial_credit_note_idempotency");
    assert(partialNet[0]?.amount === 7_565, "partial_credit_note_revenue");

    const finalCreditNoteId = `cn_final_${suffix}`;
    const finalCreditNote = event(`evt_credit_final_${suffix}`, "credit_note.created", {
      id: finalCreditNoteId,
      object: "credit_note",
      status: "issued",
      post_payment_amount: 8_900,
      currency: "thb",
      created: 1_700_000_200,
      effective_at: 1_700_000_200,
      invoice: {
        id: stripeInvoiceId,
        object: "invoice",
        parent: { type: "subscription_details", quote_details: null, subscription_details: { subscription: stripeSubscriptionId, metadata: membershipMetadata } },
      },
    });
    await deliverSignedEvent(finalCreditNote);
    const [fullNet, originalRevenue] = await Promise.all([
      db.select({ amount: sql<number>`coalesce(sum(${creatorLedgerEntries.amountMinor}), 0)::int` }).from(creatorLedgerEntries).where(eq(creatorLedgerEntries.writerId, writerId)),
      db.select({ status: creatorRevenueEvents.status }).from(creatorRevenueEvents).where(eq(creatorRevenueEvents.externalReference, `stripe-invoice:${stripeInvoiceId}`)).limit(1),
    ]);
    assert(fullNet[0]?.amount === 0, "full_credit_note_revenue");
    assert(originalRevenue[0]?.status === "reversed", "full_credit_note_original_status");

    console.info("Stripe backend verification passed", {
      signedCoinWebhook: true,
      coinWebhookIdempotent: true,
      signedSubscriptionWebhook: true,
      subscriptionWebhookIdempotent: true,
      membershipInvoiceRevenueIdempotent: true,
      creatorRevenueMinor: 8_415,
      partialCreditNoteIdempotent: true,
      fullCreditNoteRevenueNet: 0,
    });
  } finally {
    if (userId) {
      await db.delete(notifications).where(eq(notifications.userId, userId));
      await db.delete(coinLedgerEntries).where(eq(coinLedgerEntries.userId, userId));
      await db.delete(coinWallets).where(eq(coinWallets.userId, userId));
      await db.delete(readerMemberships).where(eq(readerMemberships.readerId, userId));
    }
    if (writerId) {
      await db.delete(creatorLedgerEntries).where(eq(creatorLedgerEntries.writerId, writerId));
      await db.delete(creatorRevenueEvents).where(eq(creatorRevenueEvents.writerId, writerId));
    }
    if (planId) await db.delete(writerMembershipPlans).where(eq(writerMembershipPlans.id, planId));
    if (packageId) await db.delete(coinPackages).where(eq(coinPackages.id, packageId));
    if (writerId) {
      await db.delete(creatorRevenueContracts).where(eq(creatorRevenueContracts.writerId, writerId));
      await db.delete(writerProfiles).where(eq(writerProfiles.id, writerId));
    }
    if (userId) await db.delete(users).where(eq(users.id, userId));
  }
}

verifyStripeBackend()
  .catch((error: unknown) => {
    console.error("Stripe backend verification failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
