import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminChapterReorderSchema, reorderAdminChapters } from "@/services/admin-service";

export async function PATCH(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminChapterReorderSchema);
    const result = await reorderAdminChapters(input);
    return NextResponse.json({ result });
  } catch (error) {
    return adminApiError(error, request);
  }
}
