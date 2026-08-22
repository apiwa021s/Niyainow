import { handleUserRoute } from "@/app/api/me/_shared";
import { followWriter, unfollowWriter } from "@/services/creator-relationship-service";

type Context = { params: Promise<{ writerKey: string }> };

export async function POST(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "writer-follow-alias" }, async (userId) => followWriter({ userId, writerId: (await context.params).writerKey }));
}

export async function DELETE(request: Request, context: Context) {
  return handleUserRoute(request, { mutation: true, scope: "writer-follow-alias" }, async (userId) => unfollowWriter(userId, (await context.params).writerKey));
}