import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { createWriterProfile, getWriterProfileForUser, writerProfileInputSchema } from "@/services/studio-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "studio-profile" }, getWriterProfileForUser);
}

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "studio-profile-write", rateLimit: { limit: 5, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, writerProfileInputSchema);
    return createWriterProfile(userId, input);
  });
}