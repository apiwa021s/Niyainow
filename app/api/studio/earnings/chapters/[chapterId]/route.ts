import { handleUserRoute } from "@/app/api/me/_shared";
import { getStudioChapterEarnings } from "@/services/studio-analytics-service";
type Context = { params: Promise<{ chapterId: string }> };
export async function GET(request: Request, context: Context) { return handleUserRoute(request, { scope: "studio-earnings-chapter" }, async (userId) => getStudioChapterEarnings(userId, (await context.params).chapterId)); }