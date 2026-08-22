import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertAdmin } from "@/lib/auth/dal";
import { chapterRefundInputSchema, refundChapterPurchaseTrusted } from "@/services/refund-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, chapterRefundInputSchema);
    await assertAdmin();
    return NextResponse.json({ data: await refundChapterPurchaseTrusted(input) });
  } catch (error) {
    return adminApiError(error, request);
  }
}