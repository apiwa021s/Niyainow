import { handleUserRoute } from "@/app/api/me/_shared";
import { getUnreadNotificationCount } from "@/services/creator-relationship-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "notification-unread-count" }, async (userId) => ({
    unreadCount: await getUnreadNotificationCount(userId),
  }));
}
