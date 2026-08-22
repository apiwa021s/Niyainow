import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { getWriterChapter, studioChapterUpdateSchema, updateWriterChapter } from "@/services/studio-service";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  return handleUserRoute(request, { scope: "studio-chapter" }, async (userId) => {
    const { id } = await context.params;
    return getWriterChapter(userId, id);
  });
}

export async function PATCH(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-chapter-save", rateLimit: { limit: 120, windowMs: 60_000 } }, async (userId) => {
    const [{ id }, input] = await Promise.all([context.params, parseJson(request, studioChapterUpdateSchema)]);
    return updateWriterChapter(userId, id, input);
  });
}