import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminBannerInputSchema, createAdminBanner } from "@/services/admin-service";

export async function POST(request: Request) {
  try {
    const input = await parseAdminMutation(request, adminBannerInputSchema);
    const banner = await createAdminBanner(input);
    return NextResponse.json({ banner }, { status: 201 });
  } catch (error) {
    return adminApiError(error, request);
  }
}
