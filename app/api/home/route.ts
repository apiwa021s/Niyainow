import { NextResponse } from "next/server";
import { cacheLife, cacheTag } from "next/cache";

import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { getDiscoverStories } from "@/services/discover-service";

async function getCachedHomeData() {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.live);
  cacheTag("public-novels", "public-rankings");

  const [trending, newAndRising, completed, recentlyUpdated] = await Promise.all([
    getDiscoverStories({ sort: "popular" }),
    getDiscoverStories({ sort: "recent" }),
    getDiscoverStories({ sort: "updated", status: "completed" }),
    getDiscoverStories({ sort: "updated" }),
  ]);
  return { featured: trending.slice(0, 8), forYou: trending, trendingTonight: trending, newAndRising, completed, recentlyUpdated };
}

export async function GET() {
  return NextResponse.json(
    { data: await getCachedHomeData() },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=900" } },
  );
}
