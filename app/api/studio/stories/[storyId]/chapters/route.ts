import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { createWriterChapter, listWriterChapters, studioChapterInputSchema } from "@/services/studio-service";

type Context = { params: Promise<{ storyId: string }> };

export async function GET(request: Request, context: Context) {
  return handleUserRoute(request, { scope: "studio-chapters" }, async (userId) => {
    const { storyId } = await context.params;
    return listWriterChapters(userId, storyId);
  });
}

export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-chapter-create", rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => {
    const [{ storyId }, input] = await Promise.all([context.params, parseJson(request, studioChapterInputSchema)]);
    return createWriterChapter(userId, storyId, input);
  });
}