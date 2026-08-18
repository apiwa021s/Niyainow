import { z } from "zod";

import { ApiError, parseJson } from "@/lib/http/api-response";
import { getUserNovelState, removeReview, saveReview } from "@/services/user-service";

import { handleUserRoute } from "../_shared";

const reviewSchema = z.object({
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
  title: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(20).max(5_000),
  isSpoiler: z.boolean().optional().default(false),
}).refine((input) => Boolean(input.slug || input.novelSlug));
const removeSchema = z.object({
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
}).refine((input) => Boolean(input.slug || input.novelSlug));

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-review-read" }, async (userId) => {
    const params = new URL(request.url).searchParams;
    const novelSlug = (params.get("slug") ?? params.get("novelSlug"))?.trim();
    if (!novelSlug) throw new ApiError(400, "NOVEL_SLUG_REQUIRED", "ต้องระบุรหัสนิยาย");
    const state = await getUserNovelState(userId, novelSlug, { includeReview: true });
    return { novelSlug, review: state.review };
  });
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-review-write", rateLimit: { limit: 10, windowMs: 60 * 60_000 } },
    async (userId) => {
      const input = await parseJson(request, reviewSchema);
      return saveReview(userId, {
        novelSlug: input.slug ?? input.novelSlug!,
        title: input.title,
        body: input.body,
        isSpoiler: input.isSpoiler,
      });
    },
  );
}

export const POST = PUT;

export async function DELETE(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-review-delete", rateLimit: { limit: 10, windowMs: 60 * 60_000 } },
    async (userId) => {
      const input = await parseJson(request, removeSchema);
      return removeReview(userId, input.slug ?? input.novelSlug!);
    },
  );
}
