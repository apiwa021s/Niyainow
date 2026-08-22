import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { createCoinTopup } from "@/services/payment-service";

const inputSchema = z.object({
  packageId: z.string().uuid(),
  returnUrl: z.string().trim().min(1).max(2_000),
  idempotencyKey: z.string().trim().min(8).max(128),
}).strict();
export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "coin-topup", rateLimit: { limit: 5, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, inputSchema);
    return createCoinTopup(userId, input.packageId, input.returnUrl, input.idempotencyKey);
  });
}