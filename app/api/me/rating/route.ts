import { z } from "zod";

import { ApiError, parseJson } from "@/lib/http/api-response";
import { getUserNovelState, removeRating, setRating } from "@/services/user-service";

import { handleUserRoute } from "../_shared";

const ratingSchema = z.object({
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
  score: z.number().int().min(1).max(5),
}).refine((input) => Boolean(input.slug || input.novelSlug));
const removeSchema = z.object({
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
}).refine((input) => Boolean(input.slug || input.novelSlug));

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-rating-read" }, async (userId) => {
    const params = new URL(request.url).searchParams;
    const novelSlug = (params.get("slug") ?? params.get("novelSlug"))?.trim();
    if (!novelSlug) throw new ApiError(400, "NOVEL_SLUG_REQUIRED", "ต้องระบุรหัสนิยาย");
    const state = await getUserNovelState(userId, novelSlug);
    return { novelSlug, score: state.rating };
  });
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-rating-write", rateLimit: { limit: 30, windowMs: 60 * 60_000 } },
    async (userId) => {
      const input = await parseJson(request, ratingSchema);
      return setRating(userId, input.slug ?? input.novelSlug!, input.score);
    },
  );
}

export async function DELETE(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-rating-delete", rateLimit: { limit: 30, windowMs: 60 * 60_000 } },
    async (userId) => {
      const input = await parseJson(request, removeSchema);
      return removeRating(userId, input.slug ?? input.novelSlug!);
    },
  );
}
