import { NextResponse } from "next/server";

import { adminApiError } from "@/app/api/admin/_shared";
import { getActiveTranslationQueue } from "@/services/translation-service";

export async function GET(request: Request) {
  try {
    return NextResponse.json(await getActiveTranslationQueue(), {
      headers: { "cache-control": "private, no-store" },
    });
  } catch (error) {
    return adminApiError(error, request);
  }
}
