import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { handleUserRoute } from "@/app/api/me/_shared";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { ApiError, parseJson } from "@/lib/http/api-response";
import { deleteR2Object, verifyUploadedObject } from "@/lib/r2";
import { ALLOWED_IMAGE_TYPES, objectKeySchema } from "@/lib/validation/upload";

const completeSchema = z.object({ objectKey: objectKeySchema, contentType: z.enum(ALLOWED_IMAGE_TYPES), contentLength: z.number().int().positive() }).strict();

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "studio-upload-complete", rateLimit: { limit: 60, windowMs: 60 * 60_000 } }, async (userId) => {
    const input = await parseJson(request, completeSchema);
    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.objectKey, input.objectKey), eq(mediaAssets.createdBy, userId), isNull(mediaAssets.deletedAt))).limit(1);
    if (!asset) throw new ApiError(404, "MEDIA_NOT_FOUND", "ไม่พบรายการอัปโหลด");
    if (asset.contentType !== input.contentType || asset.byteSize !== input.contentLength) throw new ApiError(400, "MEDIA_MISMATCH", "ไฟล์ไม่ตรงกับรายการอัปโหลด");
    if (asset.status === "READY") return { objectKey: asset.objectKey, status: "READY" as const };
    if (asset.status !== "PENDING" || !asset.stagingKey) throw new ApiError(409, "MEDIA_STATE_INVALID", "รายการอัปโหลดไม่พร้อมตรวจสอบ");
    const [claimed] = await db.update(mediaAssets).set({ status: "VERIFYING", updatedAt: new Date() }).where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.status, "PENDING"))).returning({ id: mediaAssets.id });
    if (!claimed) throw new ApiError(409, "MEDIA_STATE_INVALID", "กำลังตรวจสอบไฟล์นี้อยู่");
    try {
      const verified = await verifyUploadedObject({ actor: { id: userId, role: "READER", status: "ACTIVE" }, stagingObjectKey: asset.stagingKey, finalObjectKey: asset.objectKey, expectedContentType: input.contentType, expectedContentLength: input.contentLength });
      await db.update(mediaAssets).set({ status: "READY", stagingKey: verified.stagingDeleted ? null : asset.stagingKey, etag: verified.etag, updatedAt: new Date() }).where(and(eq(mediaAssets.id, asset.id), eq(mediaAssets.status, "VERIFYING")));
      return { objectKey: verified.objectKey, status: "READY" as const };
    } catch (error) {
      await db.update(mediaAssets).set({ status: "FAILED", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
      try { await deleteR2Object(asset.stagingKey); } catch { /* cleanup is best effort */ }
      throw error;
    }
  });
}
