import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiError, parseAdminMutation } from "@/app/api/admin/_shared";
import { getDb } from "@/db";
import { adminAuditLogs, mediaAssets } from "@/db/schema";
import { assertAdmin } from "@/lib/auth/dal";
import { logger } from "@/lib/logger";
import { deleteR2Object, UploadVerificationError, verifyUploadedObject } from "@/lib/r2";
import {
  rateLimitHeaders,
  requestRateLimitKey,
  takeRateLimit,
  type RateLimitResult,
} from "@/lib/security/rate-limit";
import { ALLOWED_IMAGE_TYPES, objectKeySchema } from "@/lib/validation/upload";
import { AdminDataError } from "@/services/admin-service";

const completeUploadSchema = z
  .object({
    objectKey: objectKeySchema,
    contentType: z.enum(ALLOWED_IMAGE_TYPES),
    contentLength: z.number().int().positive(),
  })
  .strict();

export async function POST(request: Request) {
  let rateLimit: RateLimitResult | undefined;
  try {
    const input = await parseAdminMutation(request, completeUploadSchema);
    const actor = await assertAdmin();
    rateLimit = takeRateLimit(requestRateLimitKey(request, "admin-upload-complete", actor.id), {
      limit: 60,
      windowMs: 60 * 60_000,
    });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: { code: "RATE_LIMITED", message: "Upload completion limit exceeded" } },
        { status: 429, headers: rateLimitHeaders(rateLimit) },
      );
    }
    const [asset] = await getDb()
      .select()
      .from(mediaAssets)
      .where(and(eq(mediaAssets.objectKey, input.objectKey), isNull(mediaAssets.deletedAt)))
      .limit(1);
    if (!asset) throw new AdminDataError("MEDIA_NOT_FOUND", "Upload authorization not found", 404);
    if (actor.role !== "ADMIN" && asset.createdBy !== actor.id) {
      throw new AdminDataError("MEDIA_FORBIDDEN", "This upload belongs to another editor", 403);
    }
    if (asset.contentType !== input.contentType || asset.byteSize !== input.contentLength) {
      throw new AdminDataError("MEDIA_MISMATCH", "Uploaded file does not match its authorization", 400);
    }
    if (asset.status === "READY") {
      return NextResponse.json(
        { media: { objectKey: asset.objectKey, status: "READY" } },
        { headers: rateLimitHeaders(rateLimit) },
      );
    }
    if (asset.status !== "PENDING" || !asset.stagingKey) {
      throw new AdminDataError("MEDIA_STATE_INVALID", "Upload is no longer pending completion", 409);
    }

    // Remote verification must not hold a database lock. Claim the lifecycle
    // atomically instead; cleanup can reclaim only a stale VERIFYING row.
    const verificationStartedAt = new Date();
    const [claimed] = await getDb()
      .update(mediaAssets)
      .set({ status: "VERIFYING", updatedAt: verificationStartedAt })
      .where(
        and(
          eq(mediaAssets.id, asset.id),
          eq(mediaAssets.status, "PENDING"),
          isNull(mediaAssets.deletedAt),
        ),
      )
      .returning({ id: mediaAssets.id });
    if (!claimed) {
      throw new AdminDataError("MEDIA_STATE_INVALID", "Upload is already being completed", 409);
    }

    let verified: Awaited<ReturnType<typeof verifyUploadedObject>>;
    try {
      verified = await verifyUploadedObject({
        actor: { id: actor.id, role: actor.role as "EDITOR" | "ADMIN", status: "ACTIVE" },
        stagingObjectKey: asset.stagingKey,
        finalObjectKey: asset.objectKey,
        expectedContentType: input.contentType,
        expectedContentLength: input.contentLength,
      });
    } catch (error) {
      const rejectedAt = new Date();
      await getDb().transaction(async (tx) => {
        const [failed] = await tx
          .update(mediaAssets)
          .set({
            status: "FAILED",
            stagingKey: error instanceof UploadVerificationError && error.objectDeleted
              ? null
              : asset.stagingKey,
            deletedAt: error instanceof UploadVerificationError && error.objectDeleted
              ? rejectedAt
              : null,
            updatedAt: rejectedAt,
          })
          .where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.status, "VERIFYING")))
          .returning({ id: mediaAssets.id });
        if (!failed) return;
        await tx.insert(adminAuditLogs).values({
          actorId: actor.id,
          actorRole: actor.role,
          action: "media.reject",
          entityType: "media_asset",
          entityId: asset.id,
          before: { status: "VERIFYING" },
          after: {
            status: "FAILED",
            reason: error instanceof UploadVerificationError ? error.code : "STORAGE_VERIFICATION_FAILED",
            expectedContentType: input.contentType,
            detectedContentType: error instanceof UploadVerificationError ? error.detectedContentType : null,
            rejectedObjectDeleted: error instanceof UploadVerificationError && error.objectDeleted,
          },
        });
      });
      if (!(error instanceof UploadVerificationError)) throw error;
      throw new AdminDataError("MEDIA_CONTENT_INVALID", "Uploaded bytes are not an allowed image", 400);
    }
    const becameReady = await getDb().transaction(async (tx) => {
      const [ready] = await tx
        .update(mediaAssets)
        .set({
          status: "READY",
          objectKey: verified.objectKey,
          stagingKey: verified.stagingDeleted ? null : asset.stagingKey,
          etag: verified.etag,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(mediaAssets.id, asset.id),
            eq(mediaAssets.status, "VERIFYING"),
            isNull(mediaAssets.deletedAt),
          ),
        )
        .returning({ id: mediaAssets.id });
      if (!ready) return false;
      await tx.insert(adminAuditLogs).values({
        actorId: actor.id,
        actorRole: actor.role,
        action: "media.complete",
        entityType: "media_asset",
        entityId: asset.id,
        before: { status: "VERIFYING" },
        after: { status: "READY", objectKey: asset.objectKey, etag: verified.etag },
      });
      return true;
    });
    if (!becameReady) {
      const cleanupKeys = verified.stagingDeleted
        ? [verified.objectKey]
        : [verified.objectKey, verified.stagingObjectKey];
      const cleanup = await Promise.allSettled(cleanupKeys.map(deleteR2Object));
      if (cleanup.some((result) => result.status === "rejected")) {
        logger.warn("Failed to remove media after losing its VERIFYING lifecycle claim", {
          mediaId: asset.id,
        });
      }
      throw new AdminDataError("MEDIA_STATE_INVALID", "Upload lifecycle changed during verification", 409);
    }
    return NextResponse.json(
      { media: { objectKey: verified.objectKey, status: "READY" } },
      { headers: rateLimitHeaders(rateLimit) },
    );
  } catch (error) {
    const response = adminApiError(error, request);
    if (rateLimit) {
      for (const [name, value] of Object.entries(rateLimitHeaders(rateLimit))) response.headers.set(name, value);
    }
    return response;
  }
}
