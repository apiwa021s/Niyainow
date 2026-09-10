import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { inspectChapterRequest } from "@/lib/security/chapter-request";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import {
  attachAnonymousSessionCookie,
  resolveRequestIdentity,
  type RequestIdentity,
} from "@/lib/security/request-identity";
import { canReadChapter } from "@/services/chapter-access-service";

type Context = { params: Promise<{ id: string }> };
const privateHeaders = { "Cache-Control": "private, no-store, max-age=0" };
const chapterIdSchema = z.uuid();

export async function GET(request: Request, context: Context) {
  let requestIdentity: RequestIdentity | undefined;
  try {
    const [{ id: idInput }, user] = await Promise.all([context.params, getCurrentUser()]);
    const parsedId = chapterIdSchema.safeParse(idInput);
    if (!parsedId.success) throw new ApiError(400, "INVALID_CHAPTER_ID", "Invalid chapter identifier");
    const activeUser = user?.status === "ACTIVE" ? user : null;
    requestIdentity = resolveRequestIdentity(request, activeUser?.id);

    const burst = await takeDistributedRateLimit(`chapter-access:${requestIdentity.subjectHash}`, {
      limit: 90,
      windowMs: 60_000,
    });
    if (!burst.allowed) {
      return attachAnonymousSessionCookie(
        NextResponse.json(
          { error: "RATE_LIMITED" },
          { status: 429, headers: { ...privateHeaders, "Retry-After": "60" } },
        ),
        requestIdentity,
      );
    }

    const access = await canReadChapter(activeUser?.id ?? null, parsedId.data);
    if (!access) throw new ApiError(404, "CHAPTER_NOT_FOUND", "Chapter not found");
    const inspection = await inspectChapterRequest({
      request,
      identity: requestIdentity,
      userId: activeUser?.id,
      chapterId: access.chapterId,
      novelId: access.novelId,
      chapterNumber: access.chapterNumber,
    });
    if (!inspection.risk.allowed) {
      return attachAnonymousSessionCookie(
        NextResponse.json(
          { error: "RATE_LIMITED" },
          {
            status: 429,
            headers: { ...privateHeaders, "Retry-After": String(inspection.risk.retryAfterSeconds) },
          },
        ),
        requestIdentity,
      );
    }
    return attachAnonymousSessionCookie(
      NextResponse.json({ data: access }, { headers: privateHeaders }),
      requestIdentity,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) logger.error("Chapter access API failed", { error });
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", privateHeaders["Cache-Control"]);
    return requestIdentity ? attachAnonymousSessionCookie(response, requestIdentity) : response;
  }
}
