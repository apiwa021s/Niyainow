import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { reviewTranslationMasterSet, reviewTranslationMasterSetSchema } from "@/services/translation-master-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, reviewTranslationMasterSetSchema);
    return NextResponse.json(await reviewTranslationMasterSet(input));
  } catch (error) {
    return adminApiError(error, request);
  }
}
