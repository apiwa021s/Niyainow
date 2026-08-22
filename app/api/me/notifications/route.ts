import { handleUserRoute } from "@/app/api/me/_shared";
import { listNotifications } from "@/services/creator-relationship-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "notifications" }, (userId) => listNotifications(userId));
}