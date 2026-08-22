import { handleUserRoute } from "@/app/api/me/_shared";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { parseJson } from "@/lib/http/api-response";
import { createPresignedUpload } from "@/lib/r2";
import { uploadRequestSchema } from "@/lib/validation/upload";

const studioUploadSchema = uploadRequestSchema.refine((input) => ["cover", "avatar", "banner"].includes(input.assetType), "Studio upload type is not allowed");

export async function POST(request: Request) {
  return handleUserRoute(request, { mutation: true, scope: "studio-upload-presign", rateLimit: { limit: 30, windowMs: 60 * 60_000 } }, async (userId) => {
    const upload = await parseJson(request, studioUploadSchema);
    const signed = await createPresignedUpload({ actor: { id: userId, role: "READER", status: "ACTIVE" }, upload });
    const kind = upload.assetType === "cover" ? "COVER" : upload.assetType === "avatar" ? "AVATAR" : "BANNER";
    await getDb().insert(mediaAssets).values({ objectKey: signed.objectKey, stagingKey: signed.stagingObjectKey, kind, contentType: upload.contentType, byteSize: upload.contentLength, metadata: { originalFileName: upload.originalFileName }, createdBy: userId });
    return signed;
  });
}
