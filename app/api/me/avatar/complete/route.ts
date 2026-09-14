import { after } from "next/server";
import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { logger } from "@/lib/logger";
import { READER_AVATAR_MAX_BYTES } from "@/lib/profile/reader-avatar";
import { deleteB2Object } from "@/lib/b2";
import { ALLOWED_IMAGE_TYPES, objectKeySchema } from "@/lib/validation/upload";
import { completeReaderAvatarUpload } from "@/services/reader-avatar-service";

const completeAvatarSchema = z.object({
  objectKey: objectKeySchema.refine((key) => key.startsWith("avatars/"), "Expected an avatar object key"),
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  contentLength: z.number().int().positive().max(READER_AVATAR_MAX_BYTES),
}).strict();

function scheduleCleanup(objectKey: string | null) {
  if (!objectKey) return;
  after(async () => {
    try {
      await deleteB2Object(objectKey);
    } catch (error) {
      logger.warn("Old reader avatar cleanup failed", { objectKey, error });
    }
  });
}

export async function POST(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-avatar-complete", rateLimit: { limit: 10, windowMs: 60 * 60_000 } },
    async (userId) => {
      const input = await parseJson(request, completeAvatarSchema);
      const result = await completeReaderAvatarUpload(userId, input);
      scheduleCleanup(result.cleanupObjectKey);
      return {
        avatarUrl: result.avatarUrl,
        providerImageUrl: result.providerImageUrl,
        hasCustomAvatar: result.hasCustomAvatar,
      };
    },
  );
}
