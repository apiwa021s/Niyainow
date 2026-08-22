import { NextResponse } from "next/server";

import { ApiError, apiErrorResponse } from "@/lib/http/api-response";
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
      heatMin: number(params, "heatMin"),
      heatMax: number(params, "heatMax"),
      page: number(params, "page"),
      status: status as DiscoverFilters["status"],
      sort: sort as DiscoverFilters["sort"],
    };
    if ((filters.heatMin ?? 1) < 1 || (filters.heatMax ?? 5) > 5 || (filters.heatMin ?? 1) > (filters.heatMax ?? 5)) throw new ApiError(400, "INVALID_FILTER", "Invalid heat range");
    return NextResponse.json({ data: await getDiscoverStories(filters) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}