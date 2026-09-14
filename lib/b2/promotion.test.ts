import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const b2Mock = vi.hoisted(() => ({
  metadataChecksum: null as string | null,
  headCount: 0,
  calls: [] as Array<{ name: string; input: Record<string, unknown> }>,
  send: vi.fn(async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
    const name = command.constructor.name;
    b2Mock.calls.push({ name, input: command.input });
    if (name === "HeadObjectCommand") {
      b2Mock.headCount += 1;
      return {
        ContentType: "image/webp",
        ContentLength: 12,
        ETag: b2Mock.headCount === 1 ? '"verified-etag"' : '"final-etag"',
        VersionId: b2Mock.headCount === 1 ? "verified-version" : "final-version",
        ...(b2Mock.metadataChecksum ? { Metadata: { checksumsha256: b2Mock.metadataChecksum } } : {}),
      };
    }
    if (name === "GetObjectCommand") {
      return { Body: { transformToByteArray: async () => new TextEncoder().encode("RIFF\0\0\0\0WEBP") } };
    }
    return {};
  }),
}));

vi.mock("./client", () => ({
  getB2Client: () => ({ send: b2Mock.send }),
}));

import { verifyUploadedObject } from "./uploads";

const finalObjectKey = "covers/00000000-0000-4000-8000-000000000001.webp";
const stagingObjectKey = `staging/${finalObjectKey}`;

beforeEach(() => {
  b2Mock.metadataChecksum = null;
  b2Mock.headCount = 0;
  b2Mock.calls.length = 0;
  b2Mock.send.mockClear();
  vi.stubEnv("B2_REGION", "us-west-004");
  vi.stubEnv("B2_KEY_ID", "test-access-key");
  vi.stubEnv("B2_APPLICATION_KEY", "test-secret-key");
  vi.stubEnv("B2_BUCKET_NAME", "test-bucket");
});

describe("staging promotion", () => {
  it("binds ranged verification and copy to the HEAD version ID", async () => {
    const verified = await verifyUploadedObject({
      actor: { id: "00000000-0000-4000-8000-000000000002", role: "ADMIN", status: "ACTIVE" },
      stagingObjectKey,
      finalObjectKey,
      expectedContentType: "image/webp",
      expectedContentLength: 12,
    });

    const rangedGet = b2Mock.calls.find((call) => call.name === "GetObjectCommand");
    const copy = b2Mock.calls.find((call) => call.name === "CopyObjectCommand");
    expect(rangedGet?.input).toMatchObject({ Range: "bytes=0-63", VersionId: "verified-version" });
    expect(copy?.input).toMatchObject({
      Key: finalObjectKey,
      CopySource: `test-bucket/${stagingObjectKey}?versionId=verified-version`,
    });
    expect(verified.objectKey).toBe(finalObjectKey);
    expect(verified.stagingDeleted).toBe(true);
  });

  it("reads and verifies the full object when an authorized checksum is present", async () => {
    const bytes = new TextEncoder().encode("RIFF\0\0\0\0WEBP");
    const checksumSha256 = createHash("sha256").update(bytes).digest("base64");
    b2Mock.metadataChecksum = checksumSha256;

    await verifyUploadedObject({
      actor: { id: "00000000-0000-4000-8000-000000000002", role: "ADMIN", status: "ACTIVE" },
      stagingObjectKey,
      finalObjectKey,
      expectedContentType: "image/webp",
      expectedContentLength: 12,
      expectedChecksumSha256: checksumSha256,
    });

    const objectGet = b2Mock.calls.find((call) => call.name === "GetObjectCommand");
    expect(objectGet?.input).not.toHaveProperty("Range");
  });
});
