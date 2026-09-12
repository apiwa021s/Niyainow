import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { ApiError } from "@/lib/http/api-response";
import { saveWorldPosition } from "@/services/world-service";
import { WORLD_ID } from "@/world/types";

const positionSchema = z.object({
  worldId: z.literal(WORLD_ID),
  x: z.number().finite().min(80).max(2320),
  y: z.number().finite().min(100).max(1720),
});

export async function PUT(request: Request) {
  return handleUserRoute(request, { scope: "world-position", mutation: true, rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => {
    const parsed = positionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "INVALID_WORLD_POSITION", "ตำแหน่งในโลกไม่ถูกต้อง");
    return saveWorldPosition(userId, parsed.data);
  });
}
