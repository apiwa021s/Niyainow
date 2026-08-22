import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { handleStripeWebhook } from "@/services/stripe-webhook-service";

export async function POST(request: Request) {
  try {
    return NextResponse.json(await handleStripeWebhook(request), {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) logger.error("Stripe webhook processing failed", { error });
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    return response;
  }
}
