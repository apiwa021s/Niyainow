import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { configureTranslationWorkspace, configureTranslationWorkspaceSchema } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, configureTranslationWorkspaceSchema);
    return NextResponse.json({ workspace: await configureTranslationWorkspace((await context.params).workspaceId, input) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
