import { NextResponse } from "next/server";

import { adminApiError } from "@/app/api/admin/_shared";
import { assertSameOrigin } from "@/lib/security/request";
import { syncTranslationWorkspaceSources } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    return NextResponse.json({ result: await syncTranslationWorkspaceSources((await context.params).workspaceId) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
