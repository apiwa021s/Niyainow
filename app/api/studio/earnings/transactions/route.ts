import { handleUserRoute } from "@/app/api/me/_shared";
import { listStudioEarningTransactions } from "@/services/studio-analytics-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "studio-earning-transactions" }, listStudioEarningTransactions);
}