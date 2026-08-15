import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminChapterInputSchema, createAdminChapter } from "@/services/admin-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminChapterInputSchema);
    const chapter = await createAdminChapter(input);
    return NextResponse.json({ chapter }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
