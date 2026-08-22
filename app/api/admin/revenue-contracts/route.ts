import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { createRevenueContract, revenueContractInputSchema } from "@/services/revenue-contract-service";

export async function POST(request: Request) {
  try {
    return NextResponse.json({ data: await createRevenueContract(await parseAdminMutation(request, revenueContractInputSchema)) }, { status: 201 });
  } catch (error) { return adminApiError(error, request); }
}