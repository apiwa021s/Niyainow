import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertAdmin } from "@/lib/auth/dal";
import { assertSameOrigin } from "@/lib/security/request";
import {
  adminNovelUpdateSchema,
  deleteAdminNovel,
  updateAdminNovel,
} from "@/services/admin-service";

type Context = { params: Promise<{ slug: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminNovelUpdateSchema);
    const { slug } = await context.params;
    const novel = await updateAdminNovel(slug, input);
    return NextResponse.json({ novel });
  } catch (error) {
    return adminApiError(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    await assertAdmin();
    const { slug } = await context.params;
    const novel = await deleteAdminNovel(slug);
    return NextResponse.json({ novel });
  } catch (error) {
    return adminApiError(error);
  }
}
