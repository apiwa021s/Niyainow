import "server-only";

import { createHash } from "node:crypto";

import { PutObjectCommand } from "@aws-sdk/client-s3";

import { requireR2Env } from "@/lib/env";
import { getR2Client } from "@/lib/r2/client";
import { detectImageContentType } from "@/lib/r2/signatures";
import {
  MAX_UPLOAD_BYTES,
  objectKeySchema,
  type AllowedImageType,
} from "@/lib/validation/upload";

const COVER_HOSTS_BY_PROVIDER: Record<string, ReadonlySet<string>> = {
  mvlempyr: new Set(["assets.mvlempyr.app"]),
};

const EXTENSION_BY_CONTENT_TYPE: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function importedCoverObjectKey(
  sourceId: string,
  sourceUrl: string,
  contentType: AllowedImageType,
) {
  // Use a stable UUIDv4-shaped version identifier. A retry of the same URL
  // overwrites the same object, while a changed URL gets a new cache-safe key.
  const digest = createHash("sha256").update(sourceId).update("\0").update(sourceUrl).digest();
  digest[6] = (digest[6]! & 0x0f) | 0x40;
  digest[8] = (digest[8]! & 0x3f) | 0x80;
  const hex = digest.subarray(0, 16).toString("hex");
  const objectId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return objectKeySchema.parse(`covers/${objectId}.${EXTENSION_BY_CONTENT_TYPE[contentType]}`);
}

export class ImportedCoverError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ImportedCoverError";
  }
}

export function validateImportedCoverUrl(provider: string, value: string) {
  const url = new URL(value);
  const allowedHosts = COVER_HOSTS_BY_PROVIDER[provider];
  if (
    url.protocol !== "https:" ||
    !allowedHosts?.has(url.hostname.toLowerCase()) ||
    Boolean(url.port) ||
    url.username ||
    url.password
  ) {
    throw new ImportedCoverError("COVER_URL_NOT_ALLOWED", "Cover URL is not allowed for this provider");
  }
  return url;
}

async function readBoundedBody(response: Response, maximumBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new ImportedCoverError("COVER_TOO_LARGE", "Cover is larger than 8 MB");
  }
  if (!response.body) throw new ImportedCoverError("COVER_EMPTY", "Cover response has no body");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maximumBytes) {
        await reader.cancel();
        throw new ImportedCoverError("COVER_TOO_LARGE", "Cover is larger than 8 MB");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function uploadImportedCover(input: {
  sourceId: string;
  provider: string;
  externalWorkId: string;
  sourceUrl: string;
}) {
  const sourceUrl = validateImportedCoverUrl(input.provider, input.sourceUrl);
  const env = requireR2Env();
  const response = await fetch(sourceUrl, {
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
  });
  if (!response.ok) {
    throw new ImportedCoverError("COVER_FETCH_FAILED", `Cover server returned HTTP ${response.status}`);
  }

  const bytes = await readBoundedBody(response, MAX_UPLOAD_BYTES.cover);
  const contentType = detectImageContentType(bytes);
  if (!contentType) throw new ImportedCoverError("COVER_INVALID_IMAGE", "Cover is not a supported image");

  const objectKey = importedCoverObjectKey(input.sourceId, sourceUrl.toString(), contentType);
  const checksumSha256 = createHash("sha256").update(bytes).digest("hex");
  const uploaded = await getR2Client().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: objectKey,
    Body: bytes,
    ContentType: contentType,
    ContentLength: bytes.byteLength,
    Metadata: {
      assetType: "cover",
      source: "novel-import",
      provider: input.provider,
      externalWorkId: input.externalWorkId,
      checksumSha256,
    },
  }));

  return {
    objectKey,
    contentType,
    byteSize: bytes.byteLength,
    checksumSha256,
    etag: uploaded.ETag?.replaceAll('"', "") ?? null,
  };
}
