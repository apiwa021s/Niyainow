import { requireCronEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { isAuthorizedCronRequest } from "@/lib/security/cron-auth";
import { processNotificationOutbox } from "@/services/outbox-service";
import { publishDueChapters } from "@/services/scheduled-publishing-service";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  let secret: string;
  try {
    secret = requireCronEnv().CRON_SECRET;
  } catch (error) {
    logger.error("Publishing cron is not configured", { error });
    return Response.json({ error: { code: "CRON_NOT_CONFIGURED" } }, { status: 503 });
  }
  if (!isAuthorizedCronRequest(request, secret)) {
    return Response.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  try {
    const published = await publishDueChapters(new Date(), 100);
    const notifications = await processNotificationOutbox(new Date(), 500);
    const result = { published: published.length, notifications };
    logger.info("Publishing cron completed", result);
    return Response.json({ data: result });
  } catch (error) {
    logger.error("Publishing cron failed", { error });
    return Response.json({ error: { code: "CRON_FAILED" } }, { status: 500 });
  }
}
import { connection } from "next/server";
