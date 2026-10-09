import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import {
  addAdminImportChapter,
  adminImportManualChapterSchema,
} from "@/services/admin-import-service";

type Context = { params: Promise<{ sourceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminImportManualChapterSchema);
    const { sourceId } = await context.params;
    const chapter = await addAdminImportChapter(sourceId, input);
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
