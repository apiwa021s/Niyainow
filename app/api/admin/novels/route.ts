import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminNovelInputSchema, createAdminNovel } from "@/services/admin-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminNovelInputSchema);
    const novel = await createAdminNovel(input);
    return NextResponse.json({ novel }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
