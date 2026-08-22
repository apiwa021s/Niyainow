import { handleUserRoute } from "@/app/api/me/_shared";
import { publishWriterStory } from "@/services/studio-service";

type Context = { params: Promise<{ storyId: string }> };
export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-story-publish" }, async (userId) => publishWriterStory(userId, (await context.params).storyId));
}