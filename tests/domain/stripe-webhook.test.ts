import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { verifyStripeWebhook } from "@/lib/stripe/webhook";

describe("Stripe webhook signatures", () => {
  it("accepts an event signed over the exact raw request body", async () => {
    const secret = "whsec_test_signature_secret";
    const payload = JSON.stringify({
      id: "evt_test_signed",
      object: "event",
      api_version: null,
      created: 1_700_000_000,
      data: { object: { id: "obj_test" } },
      livemode: false,
      pending_webhooks: 1,
      request: null,
      type: "account.updated",
    });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    await expect(verifyStripeWebhook(payload, signature, secret)).resolves.toMatchObject({ id: "evt_test_signed" });
  });

  it("rejects a changed body or wrong signing secret", async () => {
    const payload = JSON.stringify({ id: "evt_test_invalid", object: "event", data: { object: {} }, type: "account.updated" });
    const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_correct" });
    await expect(verifyStripeWebhook(`${payload} `, signature, "whsec_correct")).rejects.toThrow();
    await expect(verifyStripeWebhook(payload, signature, "whsec_wrong")).rejects.toThrow();
  });
});