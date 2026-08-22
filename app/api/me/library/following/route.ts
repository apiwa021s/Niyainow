import { handleUserRoute } from "@/app/api/me/_shared";
import { listFollows } from "@/services/user-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "library-following" }, listFollows);
}