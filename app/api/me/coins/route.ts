import { handleUserRoute } from "@/app/api/me/_shared";
import { getWalletSnapshot } from "@/services/coin-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "reader-coins" }, (userId) => getWalletSnapshot(userId));
}