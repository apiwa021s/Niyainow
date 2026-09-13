import { NextResponse } from "next/server";
import { cacheLife, cacheTag } from "next/cache";

import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { getTaxonomyMasterData } from "@/services/discover-service";

async function getCachedMasterData() {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.taxonomy);
  cacheTag("public-taxonomy");
  return getTaxonomyMasterData();
}

export async function GET() {
  return NextResponse.json(
    { data: await getCachedMasterData() },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
