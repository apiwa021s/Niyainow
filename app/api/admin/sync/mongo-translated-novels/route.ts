import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertAdmin } from "@/lib/auth/dal";
import { EnvironmentConfigurationError } from "@/lib/env";
import {
  getTranslatedNovelImportStatus,
  runTranslatedNovelImport,
  TranslatedNovelImportLeaseError,
} from "@/db/import-translated-novels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 600;

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Pragma", "no-cache");
  return response;
}

function syncApiError(error: unknown) {
  if (error instanceof EnvironmentConfigurationError) {
    return noStore(
      NextResponse.json(
        {
          error: {
            code: "SYNC_CONFIGURATION_ERROR",
            message: error.message,
            retryable: false,
          },
        },
        { status: 503 },
      ),
    );
  }
  if (error instanceof TranslatedNovelImportLeaseError) {
    return noStore(
      NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message,
            retryable: true,
            retryAfterSeconds: error.retryAfterSeconds,
            leaseExpiresAt: error.leaseExpiresAt,
          },
        },
        {
          status: 409,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      ),
    );
  }
  return noStore(adminApiError(error));
}

const syncRequestSchema = z
  .object({
    execute: z.boolean().default(true),
    mode: z.enum(["auto", "backfill", "incremental"]).default("auto"),
    limit: z.number().int().min(1).max(5).default(1),
    chapterLimit: z.number().int().min(1).max(250).default(100),
    maxRuntimeSeconds: z.number().int().min(30).max(600).default(240),
    skipImages: z.boolean().default(false),
  })
  .strict();

export async function GET() {
  try {
    await assertAdmin();
    return noStore(NextResponse.json({ status: await getTranslatedNovelImportStatus() }));
  } catch (error) {
    return syncApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, syncRequestSchema);
    const result = await runTranslatedNovelImport({
      execute: input.execute,
      mode: input.mode,
      bookLimit: input.limit,
      chapterLimit: input.chapterLimit,
      maxRuntimeMs: input.maxRuntimeSeconds * 1_000,
      uploadImages: !input.skipImages,
      now: new Date(),
    });
    return noStore(
      NextResponse.json({
        result,
        status: await getTranslatedNovelImportStatus(),
      }),
    );
  } catch (error) {
    return syncApiError(error);
  }
}
