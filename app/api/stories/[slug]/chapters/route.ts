import { NextResponse } from "next/server";
import { slugSchema } from "@/lib/validation/slug";
import { listPublicStoryChapters } from "@/services/public-creator-service";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, context: Context) {
  const parsedSlug = slugSchema.safeParse((await context.params).slug);
  if (!parsedSlug.success) return NextResponse.json({ error: "INVALID_STORY_SLUG" }, { status: 400 });
  return NextResponse.json({ data: await listPublicStoryChapters(parsedSlug.data) }, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
