import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createHash } from "node:crypto";
import { z } from "zod";

import { getAssetBaseUrl, requireB2Env } from "@/lib/env";
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

import { getB2Client } from "./client";
import { detectImageContentType, IMAGE_SIGNATURE_RANGE } from "./signatures";

const uploadVerificationSchema = z.object({
  contentType: z.enum(ALLOWED_IMAGE_TYPES),
  contentLength: z.number().int().positive(),
  checksumSha256: z.string().regex(/^[A-Za-z0-9+/]{43}=$/).optional(),
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

export async function createPresignedUpload(input: {
  actor: UploadActor;
  upload: ValidatedUploadRequest | unknown;
}): Promise<PresignedUpload> {
  uploadActorSchema.parse(input.actor);
  const upload = uploadRequestSchema.parse(input.upload);
  const env = requireB2Env();
  const objectKey = generateObjectKey(upload);
  const stagingObjectKey = generateStagingObjectKey(objectKey);
  const metadata = {
    assetType: upload.assetType,
    ...(upload.checksumSha256 ? { checksumSha256: upload.checksumSha256 } : {}),
  };
  const command = new PutObjectCommand({
    Bucket: env.B2_BUCKET_NAME,
    Key: stagingObjectKey,
    ContentType: upload.contentType,
    ContentLength: upload.contentLength,
    // B2's documented S3 PutObject surface does not accept the AWS flexible
    // checksum header. Bind the requested digest as signed metadata and verify
    // it against the uploaded bytes during completion instead.
    Metadata: metadata,
  });
  const uploadUrl = await getSignedUrl(getB2Client(), command, {
    expiresIn: env.B2_UPLOAD_URL_TTL_SECONDS,
  });
  // The S3 presigner hoists x-amz-meta-* into the query string. Browsers must
  // not send the same unsigned x-amz-* header again, or B2 rejects the PUT.
  const requiredHeaders: Record<string, string> = {
    "content-type": upload.contentType,
  };

  return {
    objectKey,
    stagingObjectKey,
    uploadUrl,
    expiresAt: new Date(Date.now() + env.B2_UPLOAD_URL_TTL_SECONDS * 1_000),
    requiredHeaders,
  };
}

export async function deleteB2Object(objectKeyInput: string) {
  const objectKey = managedObjectKeySchema.parse(objectKeyInput);
  const env = requireB2Env();
  await getB2Client().send(new DeleteObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: objectKey }));
}

/**
 * Same-origin fallback for browsers that cannot reach the presigned B2 URL
 * (most commonly while a new production origin is waiting for its CORS policy
 * to be applied). Authorization and size checks happen in the route handler;
 * this helper deliberately accepts only an already-validated staging key.
 */
export async function uploadStagingObject(input: {
  stagingObjectKey: string;
  contentType: ValidatedUploadRequest["contentType"];
  contentLength: number;
  body: Uint8Array;
  assetType: ValidatedUploadRequest["assetType"];
  checksumSha256?: string;
}) {
  const stagingObjectKey = stagingObjectKeySchema.parse(input.stagingObjectKey);
  if (!Number.isSafeInteger(input.contentLength) || input.contentLength <= 0) {
    throw new Error("Upload content length must be a positive safe integer");
  }
  if (input.body.byteLength !== input.contentLength) {
    throw new Error("Upload body length does not match the authorized upload");
  }

  const env = requireB2Env();
  const checksumSha256 = input.checksumSha256 === undefined
    ? undefined
    : uploadRequestSchema.shape.checksumSha256.parse(input.checksumSha256);
  await getB2Client().send(new PutObjectCommand({
    Bucket: env.B2_BUCKET_NAME,
    Key: stagingObjectKey,
    Body: input.body,
    ContentType: input.contentType,
    ContentLength: input.contentLength,
    Metadata: {
      assetType: input.assetType,
      ...(checksumSha256 ? { checksumSha256 } : {}),
    },
  }));
}

async function rejectAndDeleteUpload(input: {
  objectKeys: readonly string[];
  expectedContentType: ValidatedUploadRequest["contentType"];
  detectedContentType: ValidatedUploadRequest["contentType"] | null;
  message: string;
}): Promise<never> {
  const results = await Promise.allSettled(input.objectKeys.map(deleteB2Object));
  const objectDeleted = results.every((result) => result.status === "fulfilled");
  for (const [index, result] of results.entries()) {
    if (result.status === "rejected") {
      logger.warn("Failed to remove rejected B2 upload; cleanup job will retry", {
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
  expectedChecksumSha256?: string;
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
    checksumSha256: input.expectedChecksumSha256,
  });
  const env = requireB2Env();
  const response = await getB2Client().send(
    new HeadObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: stagingObjectKey }),
  );

  if (
    response.ContentType !== expected.contentType ||
    response.ContentLength !== expected.contentLength ||
    (expected.checksumSha256 && response.Metadata?.checksumsha256 !== expected.checksumSha256)
  ) {
    await rejectAndDeleteUpload({
      objectKeys: [stagingObjectKey],
      expectedContentType: expected.contentType,
      detectedContentType: null,
      message: "Uploaded object metadata does not match the authorized upload",
    });
  }
  if (!response.VersionId) throw new Error("B2 did not return a version ID required for race-safe upload verification");
  const verifiedVersionId = response.VersionId;

  const rangedObject = await getB2Client().send(
    new GetObjectCommand({
      Bucket: env.B2_BUCKET_NAME,
      Key: stagingObjectKey,
      VersionId: verifiedVersionId,
      ...(expected.checksumSha256 ? {} : { Range: IMAGE_SIGNATURE_RANGE }),
    }),
  );
  if (!rangedObject.Body) throw new Error("B2 returned no body while verifying the uploaded object");

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
  if (
    expected.checksumSha256 &&
    createHash("sha256").update(signatureBytes).digest("base64") !== expected.checksumSha256
  ) {
    await rejectAndDeleteUpload({
      objectKeys: [stagingObjectKey],
      expectedContentType: expected.contentType,
      detectedContentType,
      message: "Uploaded object bytes do not match the authorized SHA-256 checksum",
    });
  }

  await getB2Client().send(
    new CopyObjectCommand({
      Bucket: env.B2_BUCKET_NAME,
      Key: finalObjectKey,
      CopySource: `${env.B2_BUCKET_NAME}/${stagingObjectKey}?versionId=${encodeURIComponent(verifiedVersionId)}`,
      MetadataDirective: "COPY",
    }),
  );
  const finalHead = await getB2Client().send(
    new HeadObjectCommand({ Bucket: env.B2_BUCKET_NAME, Key: finalObjectKey }),
  );
  if (
    finalHead.ContentType !== expected.contentType ||
    finalHead.ContentLength !== expected.contentLength ||
    (expected.checksumSha256 && finalHead.Metadata?.checksumsha256 !== expected.checksumSha256)
  ) {
    await rejectAndDeleteUpload({
      objectKeys: [stagingObjectKey, finalObjectKey],
      expectedContentType: expected.contentType,
      detectedContentType,
      message: "Promoted object metadata does not match the verified upload",
    });
  }

  let stagingDeleted = true;
  try {
    await deleteB2Object(stagingObjectKey);
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
