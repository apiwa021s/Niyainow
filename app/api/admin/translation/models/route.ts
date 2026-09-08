import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { createTranslationModel, createTranslationModelSchema } from "@/services/translation-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, createTranslationModelSchema);
    return NextResponse.json(await createTranslationModel(input), { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
