import "server-only";

import type Stripe from "stripe";

import { getDb } from "@/db";
import { notifications } from "@/db/schema";
import { getStripeClient } from "@/lib/stripe/client";
import {
  mapStripeSubscriptionStatus,
  requireStripeMetadata,
  stripeTimestamp,
} from "@/lib/stripe/domain";
import { requireStripeEnv } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";
import { verifyStripeWebhook } from "@/lib/stripe/webhook";
import { creditCoins } from "@/services/coin-service";
import { applyMembershipProviderEvent } from "@/services/membership-service";
import { recordMembershipRevenue, reverseMembershipRevenue } from "@/services/membership-revenue-service";

function positiveInteger(value: string, field: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`stripe_metadata_invalid:${field}`);
  return parsed;
}

async function fulfillCoinCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return { handled: false, reason: "PAYMENT_NOT_PAID" as const };
  const metadata = requireStripeMetadata(session.metadata, [
    "kind",
    "userId",
    "packageId",
    "coinAmount",
    "bonusCoinAmount",
    "priceMinor",
    "currency",
  ]);
  if (metadata.kind !== "coin_topup") return { handled: false, reason: "NOT_COIN_TOPUP" as const };
  if (session.client_reference_id !== metadata.userId) throw new Error("stripe_coin_user_mismatch");
  const coinAmount = positiveInteger(metadata.coinAmount, "coinAmount");
  const bonusCoinAmount = positiveInteger(metadata.bonusCoinAmount, "bonusCoinAmount");
  const priceMinor = positiveInteger(metadata.priceMinor, "priceMinor");
  const currency = metadata.currency.toUpperCase();
  if (coinAmount <= 0 || priceMinor <= 0 || !/^[A-Z]{3}$/u.test(currency)) throw new Error("stripe_coin_snapshot_invalid");
  if (session.amount_total !== priceMinor || session.currency?.toUpperCase() !== currency) {
    throw new Error("stripe_coin_amount_mismatch");
  }
  await creditCoins({
    userId: metadata.userId,
    amount: coinAmount,
    type: "TOP_UP",
    bucket: "PAID",
    paidValueMinor: priceMinor,
    currency,
    idempotencyKey: `stripe-session:${session.id}:paid`,
    externalReference: `stripe-session:${session.id}:paid`,
  });
  if (bonusCoinAmount > 0) {
    await creditCoins({
      userId: metadata.userId,
      amount: bonusCoinAmount,
      type: "PROMOTION",
      bucket: "BONUS",
      idempotencyKey: `stripe-session:${session.id}:bonus`,
      externalReference: `stripe-session:${session.id}:bonus`,
    });
  }
  await getDb().insert(notifications).values({
    userId: metadata.userId,
    type: "coin_purchase",
    title: "เติม Coins สำเร็จ",
    body: `ได้รับ ${coinAmount + bonusCoinAmount} Coins แล้ว`,
    entityType: "coin_package",
    entityId: metadata.packageId,
    dedupeKey: `stripe-coin-topup:${session.id}`,
  }).onConflictDoNothing();
  return { handled: true, kind: "coin_topup" as const };
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const items = subscription.items.data;
  if (items.length === 0) throw new Error("stripe_subscription_items_missing");
  return {
    start: stripeTimestamp(Math.min(...items.map((item) => item.current_period_start))),
    end: stripeTimestamp(Math.max(...items.map((item) => item.current_period_end))),
  };
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const metadata = requireStripeMetadata(subscription.metadata, ["readerId", "writerId", "membershipPlanId"]);
  const period = subscriptionPeriod(subscription);
  return applyMembershipProviderEvent({
    provider: "stripe",
    providerSubscriptionId: subscription.id,
    readerId: metadata.readerId,
    writerId: metadata.writerId,
    membershipPlanId: metadata.membershipPlanId,
    status: mapStripeSubscriptionStatus(subscription.status, subscription.cancel_at_period_end),
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function syncCheckoutMembership(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription" || !session.subscription) return;
  const metadata = requireStripeMetadata(session.metadata, ["readerId"]);
  if (session.client_reference_id !== metadata.readerId) throw new Error("stripe_membership_user_mismatch");
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
  await syncSubscription(subscription);
}

async function recordPaidMembershipInvoice(invoice: Stripe.Invoice) {
  if (invoice.amount_paid <= 0 || invoice.status !== "paid") return;
  const details = invoice.parent?.subscription_details;
  if (!details) return;
  const subscriptionId = typeof details.subscription === "string" ? details.subscription : details.subscription.id;
  let metadataSnapshot = details.metadata;
  if (!metadataSnapshot?.readerId || !metadataSnapshot.writerId || !metadataSnapshot.membershipPlanId) {
    const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
    await syncSubscription(subscription);
    metadataSnapshot = subscription.metadata;
  }
  const metadata = requireStripeMetadata(metadataSnapshot, [
    "readerId",
    "writerId",
    "membershipPlanId",
  ]);
  await recordMembershipRevenue({
    stripeInvoiceId: invoice.id,
    writerId: metadata.writerId,
    membershipPlanId: metadata.membershipPlanId,
    amountPaidMinor: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    occurredAt: stripeTimestamp(invoice.status_transitions.paid_at ?? invoice.created),
  });
}

export async function handleStripeWebhook(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) throw new ApiError(400, "STRIPE_SIGNATURE_MISSING", "Stripe signature is missing");
  const payload = await request.text();
  const env = requireStripeEnv();
  let event: Stripe.Event;
  try {
    event = await verifyStripeWebhook(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new ApiError(400, "STRIPE_SIGNATURE_INVALID", "Stripe signature is invalid");
  }
  const expectedLiveMode = env.STRIPE_SECRET_KEY.startsWith("sk_live_");
  if (event.livemode !== expectedLiveMode) {
    throw new ApiError(400, "STRIPE_MODE_MISMATCH", "Stripe event mode does not match configured credentials");
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.kind === "coin_topup") await fulfillCoinCheckout(session);
      if (session.metadata?.kind === "writer_membership") await syncCheckoutMembership(session);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object as Stripe.Subscription);
      break;
    case "invoice.paid":
      await recordPaidMembershipInvoice(event.data.object as Stripe.Invoice);
      break;
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const details = invoice.parent?.subscription_details;
      if (details) {
        const subscriptionId = typeof details.subscription === "string" ? details.subscription : details.subscription.id;
        await syncSubscription(await getStripeClient().subscriptions.retrieve(subscriptionId));
      }
      break;
    }
    case "credit_note.created": {
      const creditNote = event.data.object as Stripe.CreditNote;
      if (creditNote.status === "issued" && creditNote.post_payment_amount > 0) {
        const invoice = typeof creditNote.invoice === "string"
          ? await getStripeClient().invoices.retrieve(creditNote.invoice)
          : creditNote.invoice;
        const invoiceMetadata = invoice.parent?.subscription_details?.metadata;
        if (invoiceMetadata?.kind !== "writer_membership") break;
        await reverseMembershipRevenue({
          stripeInvoiceId: invoice.id,
          stripeCreditNoteId: creditNote.id,
          amountRefundedMinor: creditNote.post_payment_amount,
          currency: creditNote.currency.toUpperCase(),
          occurredAt: stripeTimestamp(creditNote.effective_at ?? creditNote.created),
        });
      }
      break;
    }
    default:
      break;
  }
  return { received: true, eventId: event.id, type: event.type };
}
