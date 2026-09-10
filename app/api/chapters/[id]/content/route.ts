import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/dal";
import { canAccessAdmin } from "@/lib/auth/permissions";
import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { inspectChapterRequest } from "@/lib/security/chapter-request";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import {
  attachAnonymousSessionCookie,
  resolveRequestIdentity,
  type RequestIdentity,
} from "@/lib/security/request-identity";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { canReadChapter, getAuthorizedChapterContent } from "@/services/chapter-access-service";

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
    const burst = await takeDistributedRateLimit(`chapter-content:${requestIdentity.subjectHash}`, {
      limit: 60,
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

    const access = await canReadChapter(activeUser?.id ?? null, parsedId.data, new Date(), {
      staffAccess: activeUser ? canAccessAdmin(activeUser) : false,
    });
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

    if (!access.allowed) {
      await recordSecurityEvent({
        event: activeUser ? "CHAPTER_DENIED" : "AUTH_FAILED",
        subjectHash: requestIdentity.subjectHash,
        ipHash: requestIdentity.ipHash,
        chapterId: access.chapterId,
        novelId: access.novelId,
        result: access.reason,
        riskLevel: inspection.risk.riskLevel,
      });
      return attachAnonymousSessionCookie(
        NextResponse.json(
          { error: "CHAPTER_LOCKED" },
          { status: activeUser ? 403 : 401, headers: privateHeaders },
        ),
        requestIdentity,
      );
    }

    const content = await getAuthorizedChapterContent(access);
    if (content === null) throw new ApiError(404, "CHAPTER_NOT_FOUND", "Chapter not found");
    await recordSecurityEvent({
      event: "CHAPTER_READ",
      subjectHash: requestIdentity.subjectHash,
      ipHash: requestIdentity.ipHash,
      chapterId: access.chapterId,
      novelId: access.novelId,
      result: access.reason,
      riskLevel: inspection.risk.riskLevel,
    });
    return attachAnonymousSessionCookie(
      NextResponse.json({ data: { access, content } }, { headers: privateHeaders }),
      requestIdentity,
    );
  } catch (error) {
    if (!(error instanceof ApiError)) logger.error("Chapter content API failed", { error });
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", privateHeaders["Cache-Control"]);
    return requestIdentity ? attachAnonymousSessionCookie(response, requestIdentity) : response;
  }
}
