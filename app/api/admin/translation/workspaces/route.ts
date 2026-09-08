import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { createTranslationWorkspace, createTranslationWorkspaceSchema } from "@/services/translation-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, createTranslationWorkspaceSchema);
    return NextResponse.json({ workspace: await createTranslationWorkspace(input) }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
