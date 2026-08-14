import { ApiError } from "@/lib/http/api-response";
import { getUserNovelState } from "@/services/user-service";

import { handleUserRoute } from "../_shared";

export async function GET(request: Request) {
  return handleUserRoute(
    request,
    { scope: "me-novel-state-read", rateLimit: { limit: 120, windowMs: 60_000 } },
    async (userId) => {
      const slug = new URL(request.url).searchParams.get("slug")?.trim();
      if (!slug || slug.length > 180) {
        throw new ApiError(400, "NOVEL_SLUG_REQUIRED", "ต้องระบุรหัสนิยายที่ถูกต้อง");
      }

      return getUserNovelState(userId, slug);
    },
  );
}
