import { z } from "zod";

import { parseJson } from "@/lib/http/api-response";
import { listFollows, removeFollow, setFollow, setFollowNotificationPreference } from "@/services/user-service";

import { handleUserRoute } from "../_shared";

const writeSchema = z.object({
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
  notificationsEnabled: z.boolean().optional().default(true),
}).strict().refine((input) => Boolean(input.slug || input.novelSlug));
const removeSchema = z.object({
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
}).strict().refine((input) => Boolean(input.slug || input.novelSlug));
const preferenceSchema = z.object({
  slug: z.string().trim().min(1).max(180),
  notificationsEnabled: z.boolean(),
}).strict();

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-follows-read" }, (userId) => listFollows(userId));
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-follows-write", rateLimit: { limit: 120, windowMs: 60_000 } },
    async (userId) => {
      const input = await parseJson(request, writeSchema);
      return setFollow(userId, input.slug ?? input.novelSlug!, input.notificationsEnabled);
    },
  );
}

export async function PATCH(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-follow-preference", rateLimit: { limit: 120, windowMs: 60_000 } },
    async (userId) => {
      const input = await parseJson(request, preferenceSchema);
      return setFollowNotificationPreference(userId, input.slug, input.notificationsEnabled);
    },
  );
}

export async function DELETE(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-follows-delete", rateLimit: { limit: 60, windowMs: 60_000 } },
    async (userId) => {
      const input = await parseJson(request, removeSchema);
      return removeFollow(userId, input.slug ?? input.novelSlug!);
    },
  );
}
