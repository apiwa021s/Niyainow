import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { createWriterStory, listWriterStories, studioStoryInputSchema } from "@/services/studio-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "studio-stories" }, listWriterStories);
}

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "studio-story-create", rateLimit: { limit: 10, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, studioStoryInputSchema);
    return createWriterStory(userId, input);
  });
}