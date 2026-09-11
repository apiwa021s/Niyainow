import { handleUserRoute } from "@/app/api/me/_shared";
import { ApiError } from "@/lib/http/api-response";
import { listNotifications } from "@/services/creator-relationship-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "notifications" }, (userId) => {
    const searchParams = new URL(request.url).searchParams;
    const limitValue = searchParams.get("limit") ?? "20";
    if (!/^\d{1,2}$/u.test(limitValue)) {
      throw new ApiError(400, "INVALID_NOTIFICATION_LIMIT", "จำนวนการแจ้งเตือนไม่ถูกต้อง");
    }
    const limit = Number(limitValue);
    if (limit < 1 || limit > 50) {
      throw new ApiError(400, "INVALID_NOTIFICATION_LIMIT", "จำนวนการแจ้งเตือนต้องอยู่ระหว่าง 1 ถึง 50");
    }
    const cursor = searchParams.get("cursor");
    if (cursor && cursor.length > 200) {
      throw new ApiError(400, "INVALID_NOTIFICATION_CURSOR", "ตำแหน่งหน้าการแจ้งเตือนไม่ถูกต้อง");
    }
    return listNotifications(userId, {
      limit,
      cursor,
      unreadOnly: searchParams.get("unread") === "true",
    });
  });
}
