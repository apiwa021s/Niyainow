import { NextResponse } from "next/server";
import { start } from "workflow/api";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { assertTranslationPermission } from "@/lib/auth/dal";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { rateLimitHeaders, requestRateLimitKey } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { enqueueTranslation, enqueueTranslationSchema } from "@/services/translation-service";
import { drainTranslationQueue } from "@/workflows/translation-queue";

type Context = { params: Promise<{ workspaceId: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const input = await parseAdminMutation(request, enqueueTranslationSchema);
    const actor = await assertTranslationPermission("translation.run");
    const limit = await takeDistributedRateLimit(requestRateLimitKey(request, "translation-job-create", actor.id), { limit: 20, windowMs: 60_000 });
    if (!limit.allowed) return NextResponse.json({ error: { code: "RATE_LIMITED", message: "สร้างงานแปลถี่เกินไป กรุณารอสักครู่" } }, { status: 429, headers: rateLimitHeaders(limit) });
    const job = await enqueueTranslation((await context.params).workspaceId, input);
    let workflowRunId: string | null = null;
    try {
      const run = await start(drainTranslationQueue);
      workflowRunId = run.runId;
      logger.info("Translation queue workflow started after enqueue", { jobId: job.id, workflowRunId });
    } catch (error) {
      // The Vercel cron is the durable repair path. Preserve the queued job so
      // a transient workflow-start failure does not lose the user's request.
      logger.error("Translation queue workflow did not start after enqueue", { jobId: job.id, error });
    }
    return NextResponse.json({ job, workflowRunId }, { status: 202, headers: rateLimitHeaders(limit) });
  } catch (error) {
    return adminApiError(error, request);
  }
}
