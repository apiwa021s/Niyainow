import { connection } from "next/server";
import { start } from "workflow/api";

import { requireCronEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";
import { hasPendingTranslationItems } from "@/services/translation-worker";
import { drainTranslationQueue } from "@/workflows/translation-queue";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  let secret: string;
  try {
    secret = requireCronEnv().CRON_SECRET;
  } catch (error) {
    logger.error("Translation cron is not configured", { error });
    return Response.json({ error: { code: "CRON_NOT_CONFIGURED" } }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request, secret)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  try {
    if (!await hasPendingTranslationItems()) {
      return Response.json({ data: { started: false, reason: "QUEUE_EMPTY" } });
    }
    const run = await start(drainTranslationQueue);
    logger.info("Translation queue workflow started by cron", { workflowRunId: run.runId });
    return Response.json({ data: { started: true, workflowRunId: run.runId } }, { status: 202 });
  } catch (error) {
    logger.error("Translation cron failed to start queue workflow", { error });
    return Response.json({ error: { code: "TRANSLATION_WORKFLOW_START_FAILED" } }, { status: 500 });
  }
}
