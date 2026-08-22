import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { getReadableChapterContent } from "@/services/chapter-access-service";

type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: Request, context: Context) {
  try {
    const [{ id }, user] = await Promise.all([context.params, getCurrentUser()]);
    const result = await getReadableChapterContent(user?.status === "ACTIVE" ? user.id : null, id);
    if (!result.access) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนนี้");
    if (!result.access.allowed || result.content === null) {
      return NextResponse.json({ error: { code: result.access.reason, access: result.access } }, { status: 403, headers });
    }
    return NextResponse.json({ data: { access: result.access, content: result.content } }, { headers });
  } catch (error) {
    if (!(error instanceof ApiError)) logger.error("Chapter content API failed", { error });
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", headers["Cache-Control"]);
    return response;
  }
}