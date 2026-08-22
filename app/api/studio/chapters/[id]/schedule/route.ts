import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { scheduleWriterChapter, studioChapterScheduleSchema } from "@/services/studio-service";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-chapter-schedule", rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => {
    const [{ id }, input] = await Promise.all([context.params, parseJson(request, studioChapterScheduleSchema)]);
    return scheduleWriterChapter(userId, id, new Date(input.scheduledAt));
  });
}