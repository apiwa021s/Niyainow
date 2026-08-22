import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { getWriterStory, studioStoryInputSchema, updateWriterStory } from "@/services/studio-service";

type Context = { params: Promise<{ storyId: string }> };

export async function GET(request: Request, context: Context) {
  return handleUserRoute(request, { scope: "studio-story" }, async (userId) => {
    const { storyId } = await context.params;
    return getWriterStory(userId, storyId);
  });
}

export async function PATCH(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-story-update", rateLimit: { limit: 30, windowMs: 60_000 } }, async (userId) => {
    const [{ storyId }, input] = await Promise.all([context.params, parseJson(request, studioStoryInputSchema)]);
    return updateWriterStory(userId, storyId, input);
  });
}