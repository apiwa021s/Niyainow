import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { getDiscoverStories } from "@/services/discover-service";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 100) throw new ApiError(400, "INVALID_QUERY", "คำค้นต้องมี 2–100 ตัวอักษร");
    return NextResponse.json({ data: await getDiscoverStories({ query, sort: "popular", page: 1 }) }, { headers: { "Cache-Control": "public, max-age=30" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}