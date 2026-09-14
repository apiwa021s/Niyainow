import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { COSMETIC_SLOTS } from "@/lib/onboarding/reader-missions";
import { equipReaderCosmetic } from "@/services/reader-mission-service";

const equipCosmeticSchema = z.object({
  slot: z.enum(COSMETIC_SLOTS),
  cosmeticItemId: z.string().min(1).max(64).regex(/^[a-z0-9-]+$/).nullable(),
  mutationId: z.uuid(),
});

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    {
      mutation: true,
      scope: "me-reader-cosmetics-equip",
      rateLimit: { limit: 30, windowMs: 60_000 },
    },
    async (userId) => {
      const input = await parseJson(request, equipCosmeticSchema);
      return equipReaderCosmetic(userId, input.slot, input.cosmeticItemId, input.mutationId);
    },
  );
}
