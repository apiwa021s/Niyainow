import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { adminImportPublishSchema, publishAdminImport } from "@/services/admin-import-service";

type Context = { params: Promise<{ sourceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, adminImportPublishSchema);
    const { sourceId } = await context.params;
    const publication = await publishAdminImport(sourceId, input);
    return NextResponse.json({ publication });
  } catch (error) {
    return adminApiError(error, request);
  }
}
