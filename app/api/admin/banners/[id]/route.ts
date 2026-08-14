import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertAdmin } from "@/lib/auth/dal";
import { assertSameOrigin } from "@/lib/security/request";
import { adminBannerInputSchema, deleteAdminBanner, updateAdminBanner } from "@/services/admin-service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminBannerInputSchema);
    const { id } = await context.params;
    const banner = await updateAdminBanner(id, input);
    return NextResponse.json({ banner });
  } catch (error) {
    return adminApiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    await assertAdmin();
    const { id } = await context.params;
    const banner = await deleteAdminBanner(id);
    return NextResponse.json({ banner });
  } catch (error) {
    return adminApiError(error);
  }
}
