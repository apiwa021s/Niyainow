import { NextResponse } from "next/server";

import { getPublicWriterMembershipPlan } from "@/services/membership-service";

type Context = { params: Promise<{ writerKey: string }> };

export async function GET(_request: Request, context: Context) {
  const { writerKey } = await context.params;
  const plan = await getPublicWriterMembershipPlan(writerKey);
  return NextResponse.json({ data: plan }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}