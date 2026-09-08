import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertTranslationPermission } from "@/lib/auth/dal";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { rateLimitHeaders, requestRateLimitKey } from "@/lib/security/rate-limit";
import { enqueueTranslation, enqueueTranslationSchema } from "@/services/translation-service";

type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, enqueueTranslationSchema);
    const actor = await assertTranslationPermission("translation.run");
    const limit = await takeDistributedRateLimit(requestRateLimitKey(request, "translation-job-create", actor.id), { limit: 20, windowMs: 60_000 });
    if (!limit.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "สร้างงานแปลถี่เกินไป กรุณารอสักครู่" } }, { status: 429, headers: rateLimitHeaders(limit) });
    const job = await enqueueTranslation((await context.params).workspaceId, input);
    return NextResponse.json({ job }, { status: 202, headers: rateLimitHeaders(limit) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
