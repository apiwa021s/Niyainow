import { and, eq, isNull } from "drizzle-orm";

import { handleUserRoute } from "@/app/api/me/_shared";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { ApiError } from "@/lib/http/api-response";
import { isReaderAvatarContentType, READER_AVATAR_MAX_BYTES } from "@/lib/profile/reader-avatar";
import { uploadStagingObject } from "@/lib/r2";
import { objectKeySchema } from "@/lib/validation/upload";

export async function POST(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-avatar-proxy", rateLimit: { limit: 10, windowMs: 60 * 60_000 } },
    async (userId) => {
      const url = new URL(request.url);
      const objectKey = objectKeySchema.safeParse(url.searchParams.get("objectKey"));
      const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
      const declaredLength = Number(request.headers.get("content-length"));
      if (!objectKey.success || !contentType || !isReaderAvatarContentType(contentType)) {
        throw new ApiError(400, "INVALID_AVATAR_UPLOAD", "ข้อมูลอัปโหลดรูปโปรไฟล์ไม่ถูกต้อง");
      }
      if (!Number.isSafeInteger(declaredLength) || declaredLength <= 0 || declaredLength > READER_AVATAR_MAX_BYTES) {
        throw new ApiError(413, "AVATAR_TOO_LARGE", "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB");
      }

      const [asset] = await getDb().select().from(mediaAssets).where(and(
        eq(mediaAssets.objectKey, objectKey.data),
        eq(mediaAssets.createdBy, userId),
        eq(mediaAssets.kind, "AVATAR"),
        isNull(mediaAssets.deletedAt),
      )).limit(1);
      if (!asset) throw new ApiError(404, "AVATAR_UPLOAD_NOT_FOUND", "ไม่พบรายการอัปโหลดรูปโปรไฟล์");
      if (asset.status !== "PENDING" || !asset.stagingKey) {
        throw new ApiError(409, "AVATAR_UPLOAD_STATE_INVALID", "รายการอัปโหลดไม่พร้อมรับไฟล์");
      }
      if (asset.contentType !== contentType || asset.byteSize !== declaredLength) {
        throw new ApiError(400, "AVATAR_UPLOAD_MISMATCH", "ไฟล์ไม่ตรงกับรายการอัปโหลด");
      }

      const body = new Uint8Array(await request.arrayBuffer());
      if (body.byteLength !== asset.byteSize) {
        throw new ApiError(400, "AVATAR_UPLOAD_MISMATCH", "ขนาดไฟล์ไม่ตรงกับรายการอัปโหลด");
      }
      await uploadStagingObject({
        stagingObjectKey: asset.stagingKey,
        contentType,
        contentLength: asset.byteSize,
        body,
        assetType: "avatar",
      });
      return { objectKey: asset.objectKey, status: "STAGED" as const };
    },
  );
}
