import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { readerClassProfileInputSchema } from "@/lib/onboarding/reader-class-validation";
import {
  getReaderClassProfile,
  saveReaderClassProfile,
} from "@/services/reader-class-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-reader-class-read" }, getReaderClassProfile);
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-reader-class-write", rateLimit: { limit: 12, windowMs: 10 * 60_000 } },
    async (userId) => saveReaderClassProfile(
      userId,
      await parseJson(request, readerClassProfileInputSchema),
    ),
  );
}
