import { NextResponse } from "next/server";

import { apiErrorResponse } from "@/lib/http/api-response";
import { getPublicWriter } from "@/services/public-creator-service";

type Context = { params: Promise<{ writerKey: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    return NextResponse.json({ data: await getPublicWriter((await context.params).writerKey) }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    return apiErrorResponse(error);
  }
}