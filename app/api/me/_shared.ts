import { NextResponse, connection } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import {
  rateLimitHeaders,
  requestRateLimitKey,
  takeRateLimit,
} from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/request";
import { requireApiUser } from "@/services/user-service";

type RouteOptions = {
  mutation?: boolean;
  scope: string;
  rateLimit?: { limit: number; windowMs: number };
};

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function handleUserRoute<T>(
  request: Request,
  options: RouteOptions,
  handler: (userId: string) => Promise<T>,
) {
  // Authenticated endpoints can never be prerendered. Mark request-time work
  // before the error boundary so a prerender bailout is not logged as an API
  // failure by the generic catch below.
  await connection();
  try {
    if (options.mutation) assertSameOrigin(request);
    const user = await requireApiUser();

    const limit = options.rateLimit
      ? takeRateLimit(requestRateLimitKey(request, options.scope, user.id), options.rateLimit)
      : null;
    if (limit && !limit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "ดำเนินการบ่อยเกินไป กรุณาลองใหม่ภายหลัง" } },
        { status: 429, headers: { ...privateHeaders, ...rateLimitHeaders(limit) } },
      );
    }

    const data = await handler(user.id);
    return NextResponse.json(
      { data },
      { headers: { ...privateHeaders, ...(limit ? rateLimitHeaders(limit) : {}) } },
    );
  } catch (error) {
    if (!(error instanceof ApiError)) {
      logger.error("Authenticated user API failed", { scope: options.scope, error });
    }
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", privateHeaders["Cache-Control"]);
    return response;
  }
}
