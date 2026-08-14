import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminReviewModerationSchema, moderateAdminReview } from "@/services/admin-service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminReviewModerationSchema);
    const { id } = await context.params;
    const review = await moderateAdminReview(id, input);
    return NextResponse.json({ review });
  } catch (error) {
    return adminApiError(error);
  }
}
