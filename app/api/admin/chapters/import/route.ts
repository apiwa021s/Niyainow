import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminChapterBulkImportSchema, bulkImportAdminChapters } from "@/services/admin-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminChapterBulkImportSchema);
    const result = await bulkImportAdminChapters(input);
    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
