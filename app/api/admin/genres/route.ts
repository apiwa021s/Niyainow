import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminGenreInputSchema, createAdminGenre } from "@/services/admin-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminGenreInputSchema);
    const genre = await createAdminGenre(input);
    return NextResponse.json({ genre }, { status: 201 });
  } catch (error) {
    return adminApiError(error);
  }
}
