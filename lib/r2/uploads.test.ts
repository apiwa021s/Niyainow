import { afterEach, describe, expect, it, vi } from "vitest";

import { destroyR2Client } from "./client";
import { createPresignedUpload, isR2PreconditionFailure } from "./uploads";

afterEach(() => {
  destroyR2Client();
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
    expect(queryKeys).not.toContain("x-amz-checksum-crc32");
    expect(queryKeys).not.toContain("x-amz-sdk-checksum-algorithm");
  });

  it("recognizes only storage precondition failures as replacement races", () => {
    expect(isR2PreconditionFailure({ $metadata: { httpStatusCode: 412 } })).toBe(true);
    expect(isR2PreconditionFailure({ name: "PreconditionFailed" })).toBe(true);
    expect(isR2PreconditionFailure({ $metadata: { httpStatusCode: 500 } })).toBe(false);
  });
});
