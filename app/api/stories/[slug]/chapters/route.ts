import { NextResponse } from "next/server";
import { listPublicStoryChapters } from "@/services/public-creator-service";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, context: Context) {
  return NextResponse.json({ data: await listPublicStoryChapters((await context.params).slug) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}