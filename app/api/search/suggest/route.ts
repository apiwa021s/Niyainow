import { NextResponse } from "next/server";

import { rateLimitHeaders, requestRateLimitKey, takeRateLimit } from "@/lib/security/rate-limit";
import { getSearchSuggestions } from "@/services/novel-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = takeRateLimit(requestRateLimitKey(request, "public-search-suggest"), {
    limit: 120,
    windowMs: 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "ค้นหาบ่อยเกินไป กรุณาลองใหม่อีกครั้ง" },
      { status: 429, headers: rateLimitHeaders(limit) },
    );
  }
  const q = new URL(request.url).searchParams.get("q")?.replace(/\s+/gu, " ").trim() ?? "";
  if (q.length < 2) return NextResponse.json({ suggestions: [] }, { headers: rateLimitHeaders(limit) });
  if (q.length > 100) return NextResponse.json({ error: "คำค้นยาวเกิน 100 ตัวอักษร" }, { status: 400, headers: rateLimitHeaders(limit) });

  const suggestions = await getSearchSuggestions(q);
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=240", ...rateLimitHeaders(limit) } },
  );
}
