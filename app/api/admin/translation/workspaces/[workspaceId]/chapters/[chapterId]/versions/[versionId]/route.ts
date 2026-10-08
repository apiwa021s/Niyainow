import { NextResponse } from "next/server";

import { adminApiError } from "@/app/api/admin/_shared";
import { getTranslationVersion } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string; chapterId: string; versionId: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { workspaceId, chapterId, versionId } = await context.params;
    return NextResponse.json(await getTranslationVersion(workspaceId, chapterId, versionId));
  } catch (error) {
    return adminApiError(error, request);
  }
}
