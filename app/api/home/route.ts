import { NextResponse } from "next/server";
import { getDiscoverStories } from "@/services/discover-service";

export async function GET() {
  const [trending, newAndRising, completed, recentlyUpdated] = await Promise.all([
    getDiscoverStories({ sort: "popular" }),
    getDiscoverStories({ sort: "recent" }),
    getDiscoverStories({ sort: "updated", status: "completed" }),
    getDiscoverStories({ sort: "updated" }),
  ]);
  return NextResponse.json({ data: { featured: trending.slice(0, 8), forYou: trending, trendingTonight: trending, newAndRising, completed, recentlyUpdated } }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}