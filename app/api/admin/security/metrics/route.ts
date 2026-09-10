import { NextResponse } from "next/server";

import { adminApiError } from "@/app/api/admin/_shared";
import { assertAdmin } from "@/lib/auth/dal";
import { getSecurityMetricsSnapshot } from "@/lib/security/security-events";

const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(request: Request) {
  try {
    await assertAdmin();
    return NextResponse.json({ data: await getSecurityMetricsSnapshot() }, { headers: privateHeaders });
  } catch (error) {
    const response = adminApiError(error, request);
    response.headers.set("Cache-Control", privateHeaders["Cache-Control"]);
    return response;
  }
}
