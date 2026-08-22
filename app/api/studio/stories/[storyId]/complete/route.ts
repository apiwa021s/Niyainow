import { handleUserRoute } from "@/app/api/me/_shared";
import { setWriterStoryStatus } from "@/services/studio-service";

type Context = { params: Promise<{ storyId: string }> };
export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-story-complete" }, async (userId) => setWriterStoryStatus(userId, (await context.params).storyId, "COMPLETED"));
}