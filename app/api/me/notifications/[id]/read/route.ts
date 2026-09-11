import { handleUserRoute } from "@/app/api/me/_shared";
import { ApiError } from "@/lib/http/api-response";
import { markNotificationRead } from "@/services/creator-relationship-service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "notification-read", rateLimit: { limit: 120, windowMs: 60_000 } }, async (userId) => {
    const { id } = await context.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(id)) {
      throw new ApiError(400, "INVALID_NOTIFICATION_ID", "รหัสการแจ้งเตือนไม่ถูกต้อง");
    }
    return markNotificationRead(userId, id);
  });
}
