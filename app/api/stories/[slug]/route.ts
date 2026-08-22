import { NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/http/api-response";
import { getPublicStory } from "@/services/public-creator-service";

type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, context: Context) {
  try { return NextResponse.json({ data: await getPublicStory((await context.params).slug) }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }); }
  catch (error) { return apiErrorResponse(error); }
}