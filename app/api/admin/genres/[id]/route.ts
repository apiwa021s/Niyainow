import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminGenreInputSchema, updateAdminGenre } from "@/services/admin-service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminGenreInputSchema);
    const { id } = await context.params;
    const genre = await updateAdminGenre(id, input);
    return NextResponse.json({ genre });
  } catch (error) {
    return adminApiError(error, request);
  }
}
