import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/dal";
import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { listVisibleWriterPosts } from "@/services/writer-post-service";

type Context = { params: Promise<{ username: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const [{ username }, user] = await Promise.all([context.params, getCurrentUser()]);
    const posts = await listVisibleWriterPosts(user?.status === "ACTIVE" ? user.id : null, username);
    return NextResponse.json({ data: posts }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
  } catch (error) {
    return apiErrorResponse(error instanceof ApiError ? error : new ApiError(500, "INTERNAL_ERROR", "ไม่สามารถโหลดโพสต์ได้"));
  }
}