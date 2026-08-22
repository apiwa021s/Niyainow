import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { parseJson } from "@/lib/http/api-response";
import { followWriter, listWriterFollows, unfollowWriter } from "@/services/creator-relationship-service";

const followSchema = z.object({
  writerId: z.string().uuid(),
  storyNotificationsEnabled: z.boolean().optional(),
  postNotificationsEnabled: z.boolean().optional(),
}).strict();

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "writer-follows" }, listWriterFollows);
}

export async function PUT(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "writer-follow-write", rateLimit: { limit: 30, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, followSchema);
    return followWriter({ userId, ...input });
  });
}

export async function DELETE(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "writer-follow-write", rateLimit: { limit: 30, windowMs: 60_000 } }, async (userId) => {
    const input = await parseJson(request, followSchema.pick({ writerId: true }));
    return unfollowWriter(userId, input.writerId);
  });
}