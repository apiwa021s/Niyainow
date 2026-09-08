import { NextResponse } from "next/server";

import { adminApiError } from "@/app/api/admin/_shared";
import { assertSameOrigin } from "@/lib/security/request";
import { cancelTranslationJob } from "@/services/translation-service";

type Context = { params: Promise<{ jobId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    return NextResponse.json({ job: await cancelTranslationJob((await context.params).jobId) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
