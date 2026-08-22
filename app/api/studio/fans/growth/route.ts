import { handleUserRoute } from "@/app/api/me/_shared";
import { getStudioFanGrowth } from "@/services/studio-analytics-service";
export async function GET(request: Request) { return handleUserRoute(request, { scope: "studio-fan-growth" }, getStudioFanGrowth); }