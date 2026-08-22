import { handleUserRoute } from "@/app/api/me/_shared";
import { listUserLibrary } from "@/services/user-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "library-completed" }, (userId) => listUserLibrary(userId, "COMPLETED"));
}