import { NextResponse } from "next/server";

import { getPublicWriterMembershipPlan } from "@/services/membership-service";

type Context = { params: Promise<{ writerId: string }> };

export async function GET(_request: Request, context: Context) {
  const { writerId } = await context.params;
  const plan = await getPublicWriterMembershipPlan(writerId);
  return NextResponse.json({ data: plan }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}