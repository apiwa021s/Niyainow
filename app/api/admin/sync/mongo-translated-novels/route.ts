import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertAdmin } from "@/lib/auth/dal";
import {
  getTranslatedNovelImportStatus,
  runTranslatedNovelImport,
} from "@/db/import-translated-novels";

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

export async function GET(request: Request) {
  try {
    await assertAdmin();
    return NextResponse.json({ status: await getTranslatedNovelImportStatus() });
  } catch (error) {
    return adminApiError(error, request);
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
    return NextResponse.json({
      result,
      status: await getTranslatedNovelImportStatus(),
    });
  } catch (error) {
    return adminApiError(error, request);
  }
}
