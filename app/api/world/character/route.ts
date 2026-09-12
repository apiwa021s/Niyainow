import { handleUserRoute } from "@/app/api/me/_shared";
import { ApiError } from "@/lib/http/api-response";
import { getWorldCharacter, saveWorldCharacter } from "@/services/world-service";
import { worldCharacterInputSchema } from "@/world/types";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "world-character-read" }, getWorldCharacter);
}

export async function POST(request: Request) {
  return handleUserRoute(request, { scope: "world-character-save", mutation: true, rateLimit: { limit: 8, windowMs: 60_000 } }, async (userId) => {
    const parsed = worldCharacterInputSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new ApiError(400, "INVALID_WORLD_CHARACTER", "ข้อมูลตัวละครไม่ถูกต้อง");
    return saveWorldCharacter(userId, parsed.data);
  });
}
