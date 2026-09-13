import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
import { takeDistributedRateLimit } from "@/lib/security/distributed-rate-limit";
import { rateLimitHeaders, requestRateLimitKey, type RateLimitResult } from "@/lib/security/rate-limit";
import { getDiscoverStories, type DiscoverFilters } from "@/services/discover-service";

function list(params: URLSearchParams, key: string) {
  return params.getAll(key).flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean).slice(0, 20);
}

function number(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (value === null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new ApiError(400, "INVALID_FILTER", `Invalid ${key}`);
  return parsed;
}

export async function GET(request: Request) {
  let limit: RateLimitResult | undefined;
  try {
    const params = new URL(request.url).searchParams;
    const status = params.get("status") ?? undefined;
    const sort = params.get("sort") ?? undefined;
    if (status && !["ongoing", "completed", "paused"].includes(status)) throw new ApiError(400, "INVALID_FILTER", "Invalid status");
    if (sort && !["recent", "updated", "popular"].includes(sort)) throw new ApiError(400, "INVALID_FILTER", "Invalid sort");
    const filters: DiscoverFilters = {
      genreIds: list(params, "genreIds"),
      relationshipIds: list(params, "relationshipIds"),
      settingIds: list(params, "settingIds"),
      tropeIds: list(params, "tropeIds"),
      page: number(params, "page"),
      status: status as DiscoverFilters["status"],
      sort: sort as DiscoverFilters["sort"],
    };
    limit = await takeDistributedRateLimit(requestRateLimitKey(request, "public-discover"), { limit: 60, windowMs: 60_000 });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "เรียกดูรายการบ่อยเกินไป กรุณาลองใหม่อีกครั้ง" } },
        { status: 429, headers: rateLimitHeaders(limit) },
      );
    }
    return NextResponse.json(
      { data: await getDiscoverStories(filters) },
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
