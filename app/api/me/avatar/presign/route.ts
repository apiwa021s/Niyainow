import { handleUserRoute } from "@/app/api/me/_shared";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { parseJson } from "@/lib/http/api-response";
import { READER_AVATAR_MAX_BYTES } from "@/lib/profile/reader-avatar";
import { createPresignedUpload } from "@/lib/b2";
import { uploadRequestSchema } from "@/lib/validation/upload";

const readerAvatarUploadSchema = uploadRequestSchema.superRefine((input, context) => {
  if (input.assetType !== "avatar") {
    context.addIssue({ code: "custom", path: ["assetType"], message: "รองรับเฉพาะรูปโปรไฟล์" });
  }
  if (input.contentLength > READER_AVATAR_MAX_BYTES) {
    context.addIssue({ code: "custom", path: ["contentLength"], message: "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 2 MB" });
  }
});

export async function POST(request: Request) {
  return handleUserRoute(
    request,
    { mutation: true, scope: "me-avatar-presign", rateLimit: { limit: 10, windowMs: 60 * 60_000 } },
    async (userId) => {
      const upload = await parseJson(request, readerAvatarUploadSchema);
      const signed = await createPresignedUpload({
        actor: { id: userId, role: "READER", status: "ACTIVE" },
        upload,
      });
      await getDb().insert(mediaAssets).values({
        objectKey: signed.objectKey,
        stagingKey: signed.stagingObjectKey,
        kind: "AVATAR",
        contentType: upload.contentType,
        byteSize: upload.contentLength,
        metadata: { originalFileName: upload.originalFileName, purpose: "reader-profile-avatar" },
        createdBy: userId,
      });
      return signed;
    },
  );
}
