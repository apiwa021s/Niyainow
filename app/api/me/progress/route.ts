import { z } from "zod";

import { ApiError, parseJson } from "@/lib/http/api-response";
import { getUserNovelState, saveReadingProgress } from "@/services/user-service";

import { handleUserRoute } from "../_shared";

const progressSchema = z.object({
  chapterId: z.uuid(),
  progressPercent: z.number().finite().min(0).max(100),
  position: z.number().int().min(0).max(2_147_483_647),
  completed: z.boolean().optional().default(false),
});

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-progress-read" }, async (userId) => {
    const params = new URL(request.url).searchParams;
    const novelSlug = (params.get("slug") ?? params.get("novelSlug"))?.trim();
    if (!novelSlug) throw new ApiError(400, "NOVEL_SLUG_REQUIRED", "ต้องระบุรหัสนิยาย");
    return getUserNovelState(userId, novelSlug);
  });
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-progress-write", rateLimit: { limit: 180, windowMs: 10 * 60_000 } },
    async (userId) => {
      const input = await parseJson(request, progressSchema);
      return saveReadingProgress(userId, input);
    },
  );
}

export const POST = PUT;
