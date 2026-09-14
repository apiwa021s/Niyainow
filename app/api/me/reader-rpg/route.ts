import { handleUserRoute } from "@/app/api/me/_shared";
import { getReaderRpgSummary } from "@/services/reader-rpg-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-reader-rpg-read" }, getReaderRpgSummary);
}
