import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";

import { destroyB2Client } from "./client";
import { createPresignedUpload, uploadStagingObject } from "./uploads";

afterEach(() => {
  destroyB2Client();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("B2 presign policy", () => {
  it("signs only a private staging key without an empty-body CRC32", async () => {
    vi.stubEnv("B2_REGION", "us-west-004");
    vi.stubEnv("B2_KEY_ID", "test-access-key");
    vi.stubEnv("B2_APPLICATION_KEY", "test-secret-key");
    vi.stubEnv("B2_BUCKET_NAME", "test-bucket");
    vi.stubEnv("B2_UPLOAD_URL_TTL_SECONDS", "300");

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
    expect(url.origin).toBe("https://s3.us-west-004.backblazeb2.com");
    expect(decodeURIComponent(url.pathname)).toContain("/test-bucket/staging/");
    expect(signed.requiredHeaders).toEqual({ "content-type": "image/webp" });
    expect(queryKeys).not.toContain("x-amz-checksum-crc32");
    expect(queryKeys).not.toContain("x-amz-sdk-checksum-algorithm");
  });

  it("binds an explicit SHA-256 checksum as B2-compatible signed metadata", async () => {
    vi.stubEnv("B2_REGION", "us-west-004");
    vi.stubEnv("B2_KEY_ID", "test-access-key");
    vi.stubEnv("B2_APPLICATION_KEY", "test-secret-key");
    vi.stubEnv("B2_BUCKET_NAME", "test-bucket");
    vi.stubEnv("B2_UPLOAD_URL_TTL_SECONDS", "300");

    const checksumSha256 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    const signed = await createPresignedUpload({
      actor: { id: "00000000-0000-4000-8000-000000000001", role: "ADMIN", status: "ACTIVE" },
      upload: {
        assetType: "novelAsset",
        originalFileName: "page-1.webp",
        contentType: "image/webp",
        contentLength: 1_024,
        checksumSha256,
      },
    });
    const url = new URL(signed.uploadUrl);

    expect(url.searchParams.get("x-amz-checksum-sha256")).toBeNull();
    expect(url.searchParams.get("x-amz-meta-checksumsha256")).toBe(checksumSha256);
    expect(signed.requiredHeaders).toEqual({ "content-type": "image/webp" });
  });

  it("uploads an authorized fallback body only to its staging key", async () => {
    vi.stubEnv("B2_REGION", "us-west-004");
    vi.stubEnv("B2_KEY_ID", "test-access-key");
    vi.stubEnv("B2_APPLICATION_KEY", "test-secret-key");
    vi.stubEnv("B2_BUCKET_NAME", "test-bucket");
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
