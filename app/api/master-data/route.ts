import { NextResponse } from "next/server";

import { getTaxonomyMasterData } from "@/services/discover-service";

export async function GET() {
  return NextResponse.json({ data: await getTaxonomyMasterData() }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}