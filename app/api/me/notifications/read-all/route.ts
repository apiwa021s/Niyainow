import { handleUserRoute } from "@/app/api/me/_shared";
import { markAllNotificationsRead } from "@/services/creator-relationship-service";

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "notifications-read-all", rateLimit: { limit: 10, windowMs: 60_000 } }, markAllNotificationsRead);
}