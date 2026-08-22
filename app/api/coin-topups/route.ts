import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { createCoinTopup } from "@/services/payment-service";

const inputSchema = z.object({ packageId: z.string().uuid(), returnUrl: z.string().url().max(2_000) }).strict();
export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "coin-topup", rateLimit: { limit: 5, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, inputSchema);
    return createCoinTopup(userId, input.packageId, input.returnUrl);
  });
}