import { handleUserRoute } from "@/app/api/me/_shared";
import { listReadingHistory } from "@/services/user-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "library-continue" }, (userId) => listReadingHistory(userId));
}