import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  assertAdmin,
} from "@/lib/auth/dal";
import { ApiError, apiErrorResponse, parseJson } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { assertSameOrigin } from "@/lib/security/request";
import { AdminDataError } from "@/services/admin-service";

export async function parseAdminMutation<T>(request: Request, schema: ZodType<T>) {
  assertSameOrigin(request);
  await assertAdmin();
  return parseJson(request, schema);
}

function adminRequestLogContext(request?: Request) {
  if (!request) return {};

  let route: string | undefined;
  try {
    route = new URL(request.url).pathname;
  } catch {
    // A malformed URL must not mask the original API failure.
  }

  return {
    method: request.method,
    route,
    requestId: request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id") ?? undefined,
  };
}

function errorStackForLog(error: unknown) {
  if (!(error instanceof Error) || !error.stack) return undefined;
  return error.stack.split("\n").slice(0, 16).join("\n");
}

export function adminApiError(error: unknown, request?: Request) {
  if (error instanceof AuthenticationRequiredError) {
    return NextResponse.json({ error: { code: error.code, message: "Authentication required" } }, { status: 401 });
  }
  if (error instanceof AuthorizationDeniedError) {
    return NextResponse.json({ error: { code: error.code, message: "Administrator access required" } }, { status: 403 });
  }
  if (error instanceof AdminDataError) {
    return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid request data", fields: error.flatten().fieldErrors } },
      { status: 400 },
    );
  }
  const databaseError = error as { code?: string; constraint_name?: string };
  if (databaseError?.code === "23505") {
    return NextResponse.json(
      { error: { code: "CONFLICT", message: "A unique value is already in use" } },
      { status: 409 },
    );
  }
  if (error instanceof ApiError) return apiErrorResponse(error);
  logger.error("Unhandled admin API error", {
    ...adminRequestLogContext(request),
    error,
    // logger sanitization redacts credentials and caps strings at 4 KB. Error
    // objects intentionally omit production stacks, so pass a bounded copy to
    // retain the call site needed to diagnose an otherwise anonymous 500.
    errorStack: errorStackForLog(error),
  });
  return apiErrorResponse(error);
}
