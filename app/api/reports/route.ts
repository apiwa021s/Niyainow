import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { contentReportInputSchema, createContentReport } from "@/services/public-creator-service";

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "content-report", rateLimit: { limit: 10, windowMs: 60_000 } }, async (userId) => createContentReport(userId, await parseJson(request, contentReportInputSchema)));
}