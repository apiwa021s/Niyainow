import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import { getAssetBaseUrl, requireR2Env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  ALLOWED_IMAGE_TYPES,
  generateObjectKey,
  generateStagingObjectKey,
  managedObjectKeySchema,
  objectKeySchema,
  stagingObjectKeySchema,
  uploadRequestSchema,
  type ValidatedUploadRequest,
} from "@/lib/validation/upload";

import { getR2Client } from "./client";
import { detectImageContentType, IMAGE_SIGNATURE_RANGE } from "./signatures";

const uploadVerificationSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  contentLength: z.number().int().positive(),
});

const uploadActorSchema = z.object({
  id: z.uuid(),
  role: z.enum(["READER", "EDITOR", "ADMIN"]),
  status: z.literal("ACTIVE"),
});

export type UploadActor = z.infer<typeof uploadActorSchema>;

export type PresignedUpload = {
  /** Stable public key. No object exists here until successful verification. */
  objectKey: string;
  /** Private upload target that the CDN must never expose. */
  stagingObjectKey: string;
  uploadUrl: string;
  expiresAt: Date;
  requiredHeaders: Record<string, string>;
};

export class UploadVerificationError extends Error {
  readonly code = "UPLOAD_CONTENT_MISMATCH";

  constructor(
    message: string,
    readonly objectKey: string,
    readonly objectDeleted: boolean,
    readonly expectedContentType: ValidatedUploadRequest["contentType"],
    readonly detectedContentType: ValidatedUploadRequest["contentType"] | null,
  ) {
    super(message);
    this.name = "UploadVerificationError";
  }
}

export function isR2PreconditionFailure(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    candidate.$metadata?.httpStatusCode === 412 ||
    candidate.name === "PreconditionFailed" ||
    candidate.Code === "PreconditionFailed"
  );
}

export async function createPresignedUpload(input: {
  actor: UploadActor;
  upload: ValidatedUploadRequest | unknown;
}): Promise<PresignedUpload> {
  uploadActorSchema.parse(input.actor);
  const upload = uploadRequestSchema.parse(input.upload);
  const env = requireR2Env();
  const objectKey = generateObjectKey(upload);
  const stagingObjectKey = generateStagingObjectKey(objectKey);
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: stagingObjectKey,
    ContentType: upload.contentType,
    ContentLength: upload.contentLength,
    ChecksumSHA256: upload.checksumSha256,
    Metadata: { assetType: upload.assetType },
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: env.R2_UPLOAD_URL_TTL_SECONDS,
  });
  // The S3 presigner hoists x-amz-meta-* into the query string. Browsers must
  // not send the same unsigned x-amz-* header again, or R2 rejects the PUT.
  const requiredHeaders: Record<string, string> = {
    "content-type": upload.contentType,
  };
  if (upload.checksumSha256) requiredHeaders["x-amz-checksum-sha256"] = upload.checksumSha256;

  return {
    objectKey,
    stagingObjectKey,
    uploadUrl,
    expiresAt: new Date(Date.now() + env.R2_UPLOAD_URL_TTL_SECONDS * 1_000),
    requiredHeaders,
  };
}

export async function deleteR2Object(objectKeyInput: string) {
  const objectKey = managedObjectKeySchema.parse(objectKeyInput);
  const env = requireR2Env();
  await getR2Client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }));
}

async function rejectAndDeleteUpload(input: {
  objectKeys: readonly string[];
  expectedContentType: ValidatedUploadRequest["contentType"];
  detectedContentType: ValidatedUploadRequest["contentType"] | null;
  message: string;
}): Promise<never> {
  const results = await Promise.allSettled(input.objectKeys.map(deleteR2Object));
  const objectDeleted = results.every((result) => result.status === "fulfilled");
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      logger.warn("Failed to remove rejected R2 upload; cleanup job will retry", {
        error: result.reason,
        objectKey: input.objectKeys[index],
      });
    }
  }

  throw new UploadVerificationError(
    input.message,
    input.objectKeys[0] ?? "unknown",
    objectDeleted,
    input.expectedContentType,
    input.detectedContentType,
  );
}

/**
 * Verifies metadata and a bounded ranged read before a caller marks media READY.
 * HEAD Content-Type alone is user-controlled and is never treated as proof.
 */
export async function verifyUploadedObject(input: {
  actor: UploadActor;
  stagingObjectKey: string;
  finalObjectKey: string;
  expectedContentType: ValidatedUploadRequest["contentType"];
  expectedContentLength: number;
}) {
  uploadActorSchema.parse(input.actor);
  const stagingObjectKey = stagingObjectKeySchema.parse(input.stagingObjectKey);
  const finalObjectKey = objectKeySchema.parse(input.finalObjectKey);
  if (stagingObjectKey !== `staging/${finalObjectKey}`) {
    throw new Error("Staging key does not map to the authorized final object key");
  }
  const expected = uploadVerificationSchema.parse({
    contentType: input.expectedContentType,
    contentLength: input.expectedContentLength,
  });
  const env = requireR2Env();
  const response = await getR2Client().send(
    new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: stagingObjectKey }),
  );

  if (response.ContentType !== expected.contentType || response.ContentLength !== expected.contentLength) {
    await rejectAndDeleteUpload({
      objectKeys: [stagingObjectKey],
      expectedContentType: expected.contentType,
      detectedContentType: null,
      message: "Uploaded object metadata does not match the authorized upload",
    });
  }
  if (!response.ETag) throw new Error("R2 did not return an ETag required for race-safe upload verification");
  const verifiedEtag = response.ETag;

  const rangedObject = await getR2Client()
    .send(
      new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: stagingObjectKey,
        Range: IMAGE_SIGNATURE_RANGE,
        IfMatch: verifiedEtag,
      }),
    )
    .catch(async (error: unknown) => {
      if (!isR2PreconditionFailure(error)) throw error;
      return rejectAndDeleteUpload({
        objectKeys: [stagingObjectKey],
        expectedContentType: expected.contentType,
        detectedContentType: null,
        message: "Staging object changed during verification",
      });
    });
  if (!rangedObject.Body) throw new Error("R2 returned no body while verifying the uploaded object");

  const signatureBytes = await rangedObject.Body.transformToByteArray();
  const detectedContentType = detectImageContentType(signatureBytes);
  if (detectedContentType !== expected.contentType) {
    await rejectAndDeleteUpload({
      objectKeys: [stagingObjectKey],
      expectedContentType: expected.contentType,
      detectedContentType,
      message: "Uploaded object bytes do not match the authorized image type",
    });
  }

  await getR2Client()
    .send(
      new CopyObjectCommand({
        Bucket: env.R2_BUCKET_NAME,
        Key: finalObjectKey,
        CopySource: `${env.R2_BUCKET_NAME}/${stagingObjectKey}`,
        CopySourceIfMatch: verifiedEtag,
        MetadataDirective: "COPY",
      }),
    )
    .catch(async (error: unknown) => {
      if (!isR2PreconditionFailure(error)) throw error;
      return rejectAndDeleteUpload({
        objectKeys: [stagingObjectKey],
        expectedContentType: expected.contentType,
        detectedContentType: null,
        message: "Staging object changed before promotion",
      });
    });
  const finalHead = await getR2Client().send(
    new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: finalObjectKey }),
  );
  if (finalHead.ContentType !== expected.contentType || finalHead.ContentLength !== expected.contentLength) {
    await rejectAndDeleteUpload({
      objectKeys: [stagingObjectKey, finalObjectKey],
      expectedContentType: expected.contentType,
      detectedContentType,
      message: "Promoted object metadata does not match the verified upload",
    });
  }

  let stagingDeleted = true;
  try {
    await deleteR2Object(stagingObjectKey);
  } catch (error) {
    stagingDeleted = false;
    logger.warn("Verified media was promoted but its staging object needs cleanup", {
      error,
      stagingObjectKey,
      finalObjectKey,
    });
  }

  return {
    objectKey: finalObjectKey,
    stagingObjectKey,
    stagingDeleted,
    contentType: expected.contentType,
    detectedContentType,
    contentLength: finalHead.ContentLength,
    etag: finalHead.ETag?.replaceAll('"', "") ?? null,
  };
}

export function getPublicAssetUrl(objectKey: string) {
  const key = objectKeySchema.parse(objectKey);
  const baseUrl = getAssetBaseUrl();
  if (!baseUrl) throw new Error("Asset delivery URL is not configured");

  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  return `${baseUrl.replace(/\/+$/g, "")}/${encodedKey}`;
}
