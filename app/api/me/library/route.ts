import { z } from "zod";

import { ApiError, parseJson } from "@/lib/http/api-response";
import {
  listUserLibrary,
  removeFromLibrary,
  setLibraryStatus,
  type LibraryStatus,
} from "@/services/user-service";

import { handleUserRoute } from "../_shared";

const statusSchema = z.enum(["READING", "PLAN_TO_READ", "COMPLETED", "DROPPED"]);
const slugFields = {
  slug: z.string().trim().min(1).max(180).optional(),
  novelSlug: z.string().trim().min(1).max(180).optional(),
};
const writeSchema = z.object({
  ...slugFields,
  status: statusSchema,
}).refine((input) => Boolean(input.slug || input.novelSlug));
const removeSchema = z.object(slugFields).refine((input) => Boolean(input.slug || input.novelSlug));

export async function GET(request: Request) {
  return handleUserRoute(request, { scope: "me-library-read" }, async (userId) => {
    const value = new URL(request.url).searchParams.get("status");
    let status: LibraryStatus | undefined;
    if (value) {
      const parsed = statusSchema.safeParse(value);
      if (!parsed.success) throw new ApiError(400, "INVALID_STATUS", "สถานะคลังไม่ถูกต้อง");
      status = parsed.data;
    }
    return listUserLibrary(userId, status);
  });
}

export async function PUT(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-library-write", rateLimit: { limit: 120, windowMs: 60_000 } },
    async (userId) => {
      const input = await parseJson(request, writeSchema);
      return setLibraryStatus(userId, input.slug ?? input.novelSlug!, input.status);
    },
  );
}

export async function DELETE(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-library-delete", rateLimit: { limit: 60, windowMs: 60_000 } },
    async (userId) => {
      const input = await parseJson(request, removeSchema);
      return removeFromLibrary(userId, input.slug ?? input.novelSlug!);
    },
  );
}
