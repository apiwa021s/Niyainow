import { handleUserRoute } from "@/app/api/me/_shared";
import { ApiError } from "@/lib/http/api-response";
import { issueWorldTicket } from "@/lib/world-ticket";
import { getWorldCharacter } from "@/services/world-service";

export async function POST(request: Request) {
  return handleUserRoute(request, { scope: "world-ticket", mutation: true, rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => {
    const character = await getWorldCharacter(userId);
    if (!character) throw new ApiError(409, "WORLD_CHARACTER_REQUIRED", "กรุณาสร้างตัวละครก่อนเข้าโลก");
    const { id: playerId, displayName, title, currentWorld: worldId, x, y } = character;
    const { bodyPreset, skinTone, faceId, eyeId, hairId, hairColor, topId, bottomId, shoesId, accessoryIds } = character;
    const appearance = { bodyPreset, skinTone, faceId, eyeId, hairId, hairColor, topId, bottomId, shoesId, accessoryIds };
    return { ticket: issueWorldTicket({ playerId, displayName, title, appearance, worldId, x, y }) };
  });
}
