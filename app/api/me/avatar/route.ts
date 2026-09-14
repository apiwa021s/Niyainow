import { after } from "next/server";

import { handleUserRoute } from "@/app/api/me/_shared";
import { logger } from "@/lib/logger";
import { deleteB2Object } from "@/lib/b2";
import { removeReaderAvatar } from "@/services/reader-avatar-service";

export async function DELETE(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-avatar-delete", rateLimit: { limit: 10, windowMs: 60 * 60_000 } },
    async (userId) => {
      const result = await removeReaderAvatar(userId);
      const cleanupObjectKey = result.cleanupObjectKey;
      if (cleanupObjectKey) {
        after(async () => {
          try {
            await deleteB2Object(cleanupObjectKey);
          } catch (error) {
            logger.warn("Removed reader avatar cleanup failed", {
              objectKey: cleanupObjectKey,
              error,
            });
          }
        });
      }
      return {
        avatarUrl: result.avatarUrl,
        providerImageUrl: result.providerImageUrl,
        hasCustomAvatar: result.hasCustomAvatar,
      };
    },
  );
}
