import type { NextRequest } from "next/server";

import { getChapterCatalogPage } from "@/services/novel-service";

function positiveInteger(value: string | null) {
  if (!value || !/^\d+$/u.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const searchParams = request.nextUrl.searchParams;
  const catalog = await getChapterCatalogPage(slug, {
    order: searchParams.get("order") === "oldest" ? "oldest" : "latest",
    rangeStart: positiveInteger(searchParams.get("from")),
    rangeEnd: positiveInteger(searchParams.get("to")),
  });

  return Response.json(catalog, {
    headers: {
      "Cache-Control": "public, max-age=30, stale-while-revalidate=300",
    },
  });
}
