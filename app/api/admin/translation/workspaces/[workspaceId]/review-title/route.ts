import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { reviewTranslationTitle, reviewTranslationTitleSchema } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, reviewTranslationTitleSchema);
    return NextResponse.json({ review: await reviewTranslationTitle((await context.params).workspaceId, input) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
