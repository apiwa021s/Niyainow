import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { saveTranslationDraft, saveTranslationSchema } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string; chapterId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, saveTranslationSchema);
    const { workspaceId, chapterId } = await context.params;
    return NextResponse.json(await saveTranslationDraft(workspaceId, chapterId, input));
  } catch (error) {
    return adminApiError(error, request);
  }
}
