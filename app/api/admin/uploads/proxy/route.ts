import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiError } from "@/app/api/admin/_shared";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { assertAdmin } from "@/lib/auth/dal";
import { uploadStagingObject } from "@/lib/r2";
import {
  rateLimitHeaders,
  requestRateLimitKey,
  takeRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { assertSameOrigin } from "@/lib/security/request";
import { ALLOWED_IMAGE_TYPES, objectKeySchema } from "@/lib/validation/upload";
import { AdminDataError } from "@/services/admin-service";

const inputSchema = z.object({
  objectKey: objectKeySchema,
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
});

const assetTypeByKind = {
  COVER: "cover",
  BANNER: "banner",
  AVATAR: "avatar",
  NOVEL_ASSET: "novelAsset",
  OG: "og",
} as const;

/**
 * Same-origin, admin-only fallback for a failed browser -> R2 PUT. The normal
 * presigned upload remains the fast path and avoids sending binary data through
 * the application server.
 */
export async function POST(request: Request) {
  let rateLimit: RateLimitResult | undefined;
  try {
    assertSameOrigin(request);
    const actor = await assertAdmin();
    rateLimit = takeRateLimit(requestRateLimitKey(request, "admin-upload-proxy", actor.id), {
      limit: 20,
      windowMs: 60 * 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Upload fallback limit exceeded" } },
        { status: 429, headers: rateLimitHeaders(rateLimit) },
      );
    }

    const url = new URL(request.url);
    const input = inputSchema.parse({
      objectKey: url.searchParams.get("objectKey"),
      contentType: request.headers.get("content-type")?.split(";", 1)[0]?.trim(),
    });
    const [asset] = await getDb()
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.objectKey, input.objectKey), isNull(mediaAssets.deletedAt)))
      .limit(1);
    if (!asset) throw new AdminDataError("MEDIA_NOT_FOUND", "Upload authorization not found", 404);
    if (actor.role !== "ADMIN" && asset.createdBy !== actor.id) {
      throw new AdminDataError("MEDIA_FORBIDDEN", "This upload belongs to another editor", 403);
    }
    if (asset.status !== "PENDING" || !asset.stagingKey) {
      throw new AdminDataError("MEDIA_STATE_INVALID", "Upload is no longer pending", 409);
    }
    if (asset.contentType !== input.contentType) {
      throw new AdminDataError("MEDIA_MISMATCH", "File type does not match its authorization", 400);
    }

    const body = new Uint8Array(await request.arrayBuffer());
    if (body.byteLength !== asset.byteSize) {
      throw new AdminDataError("MEDIA_MISMATCH", "File size does not match its authorization", 400);
    }

    await uploadStagingObject({
      stagingObjectKey: asset.stagingKey,
      contentType: input.contentType,
      contentLength: asset.byteSize,
      body,
      assetType: assetTypeByKind[asset.kind],
    });

    return NextResponse.json(
      { upload: { objectKey: asset.objectKey, status: "STAGED" } },
      { status: 201, headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    const response = adminApiError(error, request);
    if (rateLimit) {
      for (const [name, value] of Object.entries(rateLimitHeaders(rateLimit))) response.headers.set(name, value);
    }
    return response;
  }
}
