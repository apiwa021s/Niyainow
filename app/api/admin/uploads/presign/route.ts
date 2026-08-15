import { NextResponse } from "next/server";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { getDb } from "@/db";
import { adminAuditLogs, mediaAssets } from "@/db/schema";
import { assertAdmin } from "@/lib/auth/dal";
import { createPresignedUpload } from "@/lib/r2";
import {
  rateLimitHeaders,
  requestRateLimitKey,
  takeRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { uploadRequestSchema } from "@/lib/validation/upload";

const kindByAsset = {
  cover: "COVER",
  banner: "BANNER",
  avatar: "AVATAR",
  novelAsset: "NOVEL_ASSET",
  og: "OG",
} as const;

export async function POST(request: Request) {
  let rateLimit: RateLimitResult | undefined;
  try {
    const upload = await parseAdminMutation(request, uploadRequestSchema);
    // Deliberately re-read authorization immediately before signing the upload.
    const actor = await assertAdmin();
    rateLimit = takeRateLimit(requestRateLimitKey(request, "admin-upload-presign", actor.id), {
      limit: 30,
      windowMs: 60 * 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Upload authorization limit exceeded" } },
        { status: 429, headers: rateLimitHeaders(rateLimit) },
      );
    }
    const uploadActor = { id: actor.id, role: actor.role as "EDITOR" | "ADMIN", status: "ACTIVE" as const };
    const signed = await createPresignedUpload({ actor: uploadActor, upload });
    await getDb().transaction(async (tx) => {
      await tx.insert(mediaAssets).values({
        objectKey: signed.objectKey,
        stagingKey: signed.stagingObjectKey,
        kind: kindByAsset[upload.assetType],
        contentType: upload.contentType,
        byteSize: upload.contentLength,
        metadata: { originalFileName: upload.originalFileName, checksumSha256: upload.checksumSha256 },
        createdBy: actor.id,
      });
      await tx.insert(adminAuditLogs).values({
        actorId: actor.id,
        actorRole: actor.role,
        action: "media.presign",
        entityType: "media_asset",
        entityId: signed.objectKey,
        after: {
          objectKey: signed.objectKey,
          stagingKey: signed.stagingObjectKey,
          kind: kindByAsset[upload.assetType],
          byteSize: upload.contentLength,
        },
      });
    });
    return NextResponse.json(signed, { status: 201, headers: rateLimitHeaders(rateLimit) });
  } catch (error) {
    const response = adminApiError(error, request);
    if (rateLimit) {
      for (const [name, value] of Object.entries(rateLimitHeaders(rateLimit))) response.headers.set(name, value);
    }
    return response;
  }
}
