import { NextResponse } from "next/server";

import { adminApiError } from "@/app/api/admin/_shared";
import { assertSameOrigin } from "@/lib/security/request";
import { approveTranslationVersion } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string; chapterId: string; versionId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { workspaceId, chapterId, versionId } = await context.params;
    return NextResponse.json({ version: await approveTranslationVersion(workspaceId, chapterId, versionId) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
