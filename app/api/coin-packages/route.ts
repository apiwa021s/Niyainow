import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/db";
import { coinPackages } from "@/db/schema";

export async function GET() {
  const packages = await getDb().select().from(coinPackages).where(eq(coinPackages.isActive, true))
    .orderBy(asc(coinPackages.sortOrder), asc(coinPackages.id));
  return NextResponse.json({ data: packages }, { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } });
}