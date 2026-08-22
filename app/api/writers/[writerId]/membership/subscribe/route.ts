import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { subscribeToWriterMembership } from "@/services/membership-service";

const inputSchema = z.object({ planId: z.string().uuid(), returnUrl: z.string().url().max(2_000) }).strict();

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "membership-subscribe", rateLimit: { limit: 5, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, inputSchema);
    return subscribeToWriterMembership(userId, input.planId, input.returnUrl);
  });
}