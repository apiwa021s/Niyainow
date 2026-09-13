import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { rateLimitHeaders, requestRateLimitKey, type RateLimitResult } from "@/lib/security/rate-limit";
import { getDiscoverStories } from "@/services/discover-service";

export async function GET(request: Request) {
  let limit: RateLimitResult | undefined;
  try {
    const params = new URL(request.url).searchParams;
    const query = params.get("q")?.trim() ?? "";
    if (query.length < 2 || query.length > 100) throw new ApiError(400, "INVALID_QUERY", "คำค้นต้องมี 2–100 ตัวอักษร");
    limit = await takeDistributedRateLimit(requestRateLimitKey(request, "public-search"), { limit: 30, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "ค้นหาบ่อยเกินไป กรุณาลองใหม่อีกครั้ง" } },
        { status: 429, headers: rateLimitHeaders(limit) },
      );
    }
    return NextResponse.json(
      { data: await getDiscoverStories({ query, sort: "popular", page: 1 }) },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300", ...rateLimitHeaders(limit) } },
    );
  } catch (error) {
    const response = apiErrorResponse(error);
    if (limit) {
      for (const [name, value] of Object.entries(rateLimitHeaders(limit))) response.headers.set(name, value);
    }
    return response;
  }
}
