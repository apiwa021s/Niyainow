import "server-only";

import Stripe from "stripe";

import { requireStripeEnv } from "@/lib/env";

let stripeClient: Stripe | undefined;

export function getStripeClient() {
  if (stripeClient) return stripeClient;
  const env = requireStripeEnv();
  stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: { name: "NovelNow", version: "0.1.0" },
    maxNetworkRetries: 2,
    timeout: 10_000,
  });
  return stripeClient;
}