import type { NextRequest } from "next/server";

import { slugSchema } from "@/lib/validation/slug";
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
  const parsedSlug = slugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return Response.json({ error: "INVALID_NOVEL_SLUG" }, { status: 400 });
  }
  const searchParams = request.nextUrl.searchParams;
  const catalog = await getChapterCatalogPage(parsedSlug.data, {
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
