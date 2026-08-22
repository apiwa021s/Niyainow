import Stripe from "stripe";

export async function verifyStripeWebhook(
  payload: string,
  signature: string,
  webhookSecret: string,
) {
  return Stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
}