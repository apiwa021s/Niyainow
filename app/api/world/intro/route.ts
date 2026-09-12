import { handleUserRoute } from "@/app/api/me/_shared";
import { completeWorldIntro } from "@/services/world-service";

export async function POST(request: Request) {
  return handleUserRoute(request, { scope: "world-intro", mutation: true, rateLimit: { limit: 6, windowMs: 60_000 } }, completeWorldIntro);
}
