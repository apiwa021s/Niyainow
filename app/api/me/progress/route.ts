import { z } from "zod";

import { ApiError, parseJson } from "@/lib/http/api-response";
import { getUserNovelState, saveReadingProgress } from "@/services/user-service";
import { recordReadingEvidence } from "@/services/reader-rpg-service";

import { handleUserRoute } from "../_shared";

const progressSchema = z.object({
  chapterId: z.uuid(),
  progressPercent: z.number().finite().min(0).max(100),
  position: z.number().int().min(0).max(2_147_483_647),
  completed: z.boolean().optional().default(false),
  readingSessionId: z.uuid().optional(),
  activeSeconds: z.number().int().min(0).max(86_400).optional(),
}).superRefine((input, context) => {
  if (Boolean(input.readingSessionId) !== (input.activeSeconds !== undefined)) {
    context.addIssue({
      code: "custom",
      path: [input.readingSessionId ? "activeSeconds" : "readingSessionId"],
      message: "ต้องส่ง readingSessionId และ activeSeconds มาคู่กัน",
    });
  }
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
      const progress = await saveReadingProgress(userId, input);
      const readerRpg = input.readingSessionId && input.activeSeconds !== undefined
        ? await recordReadingEvidence(userId, input.chapterId, {
            sessionId: input.readingSessionId,
            activeSeconds: input.activeSeconds,
            progressPercent: input.progressPercent,
          })
        : null;
      return { ...progress, readerRpg };
    },
  );
}

export const POST = PUT;
