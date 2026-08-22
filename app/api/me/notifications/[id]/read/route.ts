import { handleUserRoute } from "@/app/api/me/_shared";
import { markNotificationRead } from "@/services/creator-relationship-service";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "notification-read", rateLimit: { limit: 120, windowMs: 60_000 } }, async (userId) => {
    const { id } = await context.params;
    return markNotificationRead(userId, id);
  });
}