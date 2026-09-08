import { NextResponse, connection } from "next/server";
import type { ZodType } from "zod";

import { EnvironmentConfigurationError, requireNovelImportEnv } from "@/lib/env";
import { ApiError } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { hasValidNovelImportAuthorization } from "@/lib/security/novel-import-auth";
import { rateLimitHeaders, requestRateLimitKey } from "@/lib/security/rate-limit";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

async function parseSizedJson<T>(request: Request, schema: ZodType<T>, maximumBytes: number) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Content-Type must be application/json");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Import payload is too large");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > maximumBytes) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "Import payload is too large");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new ApiError(400, "INVALID_REQUEST", "Request body must be valid JSON");
  }

  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(400, "INVALID_REQUEST", "Request body does not match the novel import contract");
  }
  return parsed.data;
}

export async function handleNovelImportRoute<TInput, TResult>(
  request: Request,
  options: {
    schema: ZodType<TInput>;
    maximumBytes: number;
    scope: string;
    rateLimit: { limit: number; windowMs: number };
  },
  handler: (input: TInput) => Promise<TResult>,
) {
  await connection();
  try {
    const { NOVEL_IMPORT_TOKEN } = requireNovelImportEnv();
    if (!hasValidNovelImportAuthorization(request, NOVEL_IMPORT_TOKEN)) {
      return NextResponse.json(
        { error: "Novel import authentication failed", code: "UNAUTHORIZED" },
        {
          status: 401,
          headers: { ...privateHeaders, "WWW-Authenticate": "Bearer" },
        },
      );
    }

    const limit = await takeDistributedRateLimit(
      requestRateLimitKey(request, options.scope),
      options.rateLimit,
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Novel import rate limit exceeded", code: "RATE_LIMITED" },
        { status: 429, headers: { ...privateHeaders, ...rateLimitHeaders(limit) } },
      );
    }

    const input = await parseSizedJson(request, options.schema, options.maximumBytes);
    const result = await handler(input);
    return NextResponse.json(result, {
      headers: { ...privateHeaders, ...rateLimitHeaders(limit) },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status, headers: privateHeaders },
      );
    }
    if (error instanceof EnvironmentConfigurationError) {
      return NextResponse.json(
        { error: "Novel import API is not configured", code: "IMPORT_NOT_CONFIGURED" },
        { status: 503, headers: privateHeaders },
      );
    }

    logger.error("Novel import API failed", {
      route: new URL(request.url).pathname,
      requestId: request.headers.get("x-vercel-id") ?? request.headers.get("x-request-id") ?? undefined,
      error,
    });
    return NextResponse.json(
      { error: "Novel import failed", code: "INTERNAL_ERROR" },
      { status: 500, headers: privateHeaders },
    );
  }
}
