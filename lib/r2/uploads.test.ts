import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { destroyR2Client } from "./client";
import { createPresignedUpload, isR2PreconditionFailure, uploadStagingObject } from "./uploads";

afterEach(() => {
  destroyR2Client();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("R2 presign policy", () => {
  it("signs only a private staging key without an empty-body CRC32", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "testaccount");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
    vi.stubEnv("R2_UPLOAD_URL_TTL_SECONDS", "300");

    const signed = await createPresignedUpload({
      actor: { id: "00000000-0000-4000-8000-000000000001", role: "ADMIN", status: "ACTIVE" },
      upload: {
        assetType: "cover",
        originalFileName: "cover.webp",
        contentType: "image/webp",
        contentLength: 1_024,
      },
    });
    const url = new URL(signed.uploadUrl);
    const queryKeys = [...url.searchParams.keys()].map((key) => key.toLowerCase());

    expect(signed.objectKey).toMatch(/^covers\//);
    expect(signed.stagingObjectKey).toBe(`staging/${signed.objectKey}`);
    expect(decodeURIComponent(url.pathname)).toContain(`/staging/${signed.objectKey}`);
    expect(url.searchParams.get("x-amz-meta-assettype")).toBe("cover");
    expect(signed.requiredHeaders).toEqual({ "content-type": "image/webp" });
    expect(queryKeys).not.toContain("x-amz-checksum-crc32");
    expect(queryKeys).not.toContain("x-amz-sdk-checksum-algorithm");
  });

  it("recognizes only storage precondition failures as replacement races", () => {
    expect(isR2PreconditionFailure({ $metadata: { httpStatusCode: 412 } })).toBe(true);
    expect(isR2PreconditionFailure({ name: "PreconditionFailed" })).toBe(true);
    expect(isR2PreconditionFailure({ $metadata: { httpStatusCode: 500 } })).toBe(false);
  });

  it("uploads an authorized fallback body only to its staging key", async () => {
    vi.stubEnv("R2_ACCOUNT_ID", "testaccount");
    vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
    vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
    vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
    const send = vi.spyOn(S3Client.prototype, "send").mockResolvedValue({} as never);
    const body = new Uint8Array([0x52, 0x49, 0x46, 0x46]);

    await uploadStagingObject({
      stagingObjectKey: "staging/covers/00000000-0000-4000-8000-000000000001.webp",
      contentType: "image/webp",
      contentLength: body.byteLength,
      body,
      assetType: "cover",
    });

    const command = send.mock.calls[0]?.[0];
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect((command as PutObjectCommand).input).toMatchObject({
      Bucket: "test-bucket",
      Key: "staging/covers/00000000-0000-4000-8000-000000000001.webp",
      Body: body,
      ContentType: "image/webp",
      ContentLength: 4,
      Metadata: { assetType: "cover" },
    });
  });
});
