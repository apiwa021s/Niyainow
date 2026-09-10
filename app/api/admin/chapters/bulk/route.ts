import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminChapterBulkActionSchema, bulkUpdateAdminChapters } from "@/services/admin-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminChapterBulkActionSchema);
    const result = await bulkUpdateAdminChapters(input);
    return NextResponse.json({ result });
  } catch (error) {
    return adminApiError(error, request);
  }
}
