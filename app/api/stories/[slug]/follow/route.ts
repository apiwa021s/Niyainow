import { handleUserRoute } from "@/app/api/me/_shared";
import { removeFollow, setFollow } from "@/services/user-service";

type Context = { params: Promise<{ slug: string }> };
export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "story-follow-alias" }, async (userId) => setFollow(userId, (await context.params).slug, true));
}
export async function DELETE(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "story-follow-alias" }, async (userId) => removeFollow(userId, (await context.params).slug));
}