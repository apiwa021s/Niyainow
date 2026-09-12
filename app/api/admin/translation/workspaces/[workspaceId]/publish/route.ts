import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import {
  bulkPublishTranslationSchema,
  publishTranslationChapters,
} from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, bulkPublishTranslationSchema);
    const { workspaceId } = await context.params;
    return NextResponse.json(await publishTranslationChapters(workspaceId, input));
  } catch (error) {
    return adminApiError(error, request);
  }
}
