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

export function adminApiError(error: unknown) {
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
  logger.error("Unhandled admin API error", { error });
  return apiErrorResponse(error);
}
