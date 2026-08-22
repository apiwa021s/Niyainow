import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { archiveStudioPost, updateStudioPost, writerPostInputSchema } from "@/services/writer-post-service";

type Context = { params: Promise<{ postId: string }> };

export async function PATCH(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-post-update", rateLimit: { limit: 30, windowMs: 60_000 } }, async (userId) => {
    const [{ postId }, input] = await Promise.all([context.params, parseJson(request, writerPostInputSchema)]);
    return updateStudioPost(userId, postId, input);
  });
}

export async function DELETE(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "studio-post-delete", rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => archiveStudioPost(userId, (await context.params).postId));
}