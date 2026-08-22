import { handleUserRoute } from "@/app/api/me/_shared";
import { unpublishWriterChapter } from "@/services/studio-service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-chapter-unpublish", rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => {
    const { id } = await context.params;
    return unpublishWriterChapter(userId, id);
  });
}