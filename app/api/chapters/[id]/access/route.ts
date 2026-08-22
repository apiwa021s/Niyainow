import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { canReadChapter } from "@/services/chapter-access-service";

type Context = { params: Promise<{ id: string }> };
const headers = { "Cache-Control": "private, no-store, max-age=0" };

export async function GET(_request: Request, context: Context) {
  try {
    const [{ id }, user] = await Promise.all([context.params, getCurrentUser()]);
    const access = await canReadChapter(user?.status === "ACTIVE" ? user.id : null, id);
    if (!access) throw new ApiError(404, "CHAPTER_NOT_FOUND", "ไม่พบตอนนี้");
    return NextResponse.json({ data: access }, { headers });
  } catch (error) {
    if (!(error instanceof ApiError)) logger.error("Chapter access API failed", { error });
    const response = apiErrorResponse(error);
    response.headers.set("Cache-Control", headers["Cache-Control"]);
    return response;
  }
}