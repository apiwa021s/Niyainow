import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { canReadChapter } from "@/services/chapter-access-service";
import { unlockChapterWithCoins } from "@/services/coin-service";

type Context = { params: Promise<{ id: string }> };

const unlockSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(128),
  expectedPrice: z.number().int().positive().max(1_000_000),
});

export async function POST(request: Request, context: Context) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "chapter-unlock", rateLimit: { limit: 20, windowMs: 60_000 } },
    async (userId) => {
      const [{ id }, input] = await Promise.all([context.params, parseJson(request, unlockSchema)]);
      const result = await unlockChapterWithCoins({
        userId,
        chapterId: id,
        expectedPrice: input.expectedPrice,
        idempotencyKey: input.idempotencyKey,
      });
      if (result.kind === "not-found") {
        return { success: false, alreadyPurchased: false, reason: "NOT_PUBLISHED" as const };
      }
      if (result.kind === "not-purchasable") {
        return { success: false, alreadyPurchased: false, reason: "NOT_PURCHASABLE" as const };
      }
      if (result.kind === "price-changed" || result.kind === "insufficient-balance") {
        return {
          success: false,
          alreadyPurchased: false,
          reason: result.kind === "price-changed" ? "PRICE_CHANGED" as const : "INSUFFICIENT_COINS" as const,
          coinPrice: result.price,
          remainingCoins: result.balance,
        };
      }

      const access = await canReadChapter(userId, id);
      return {
        success: true,
        alreadyPurchased: result.kind === "already-accessible",
        coinsUsed: result.kind === "unlocked" ? result.price : 0,
        remainingCoins: result.balance,
        chapterAccess: access,
      };
    },
  );
}