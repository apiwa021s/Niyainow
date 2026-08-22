import { handleUserRoute } from "@/app/api/me/_shared";
import { listPurchasedChapters } from "@/services/coin-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "library-purchased" }, listPurchasedChapters);
}