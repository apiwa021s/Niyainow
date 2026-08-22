import { handleUserRoute } from "@/app/api/me/_shared";
import { getStudioStoryEarnings } from "@/services/studio-analytics-service";
type Context = { params: Promise<{ storyId: string }> };
export async function GET(request: Request, context: Context) { return handleUserRoute(request, { scope: "studio-earnings-story" }, async (userId) => getStudioStoryEarnings(userId, (await context.params).storyId)); }