import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { subscribeToWriterMembership } from "@/services/membership-service";

const inputSchema = z.object({
  planId: z.string().uuid(),
  returnUrl: z.string().trim().min(1).max(2_000),
  idempotencyKey: z.string().trim().min(8).max(128),
}).strict();

type Context = { params: Promise<{ writerKey: string }> };

export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "membership-subscribe", rateLimit: { limit: 5, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, inputSchema);
    return subscribeToWriterMembership(userId, (await context.params).writerKey, input.planId, input.returnUrl, input.idempotencyKey);
  });
}