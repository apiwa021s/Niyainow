import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { createStudioPost, listStudioPosts, writerPostInputSchema } from "@/services/writer-post-service";

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "studio-posts" }, listStudioPosts);
}

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "studio-post-create", rateLimit: { limit: 20, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, writerPostInputSchema);
    return createStudioPost(userId, input);
  });
}