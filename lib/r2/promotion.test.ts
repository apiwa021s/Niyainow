import { beforeEach, describe, expect, it, vi } from "vitest";

const r2Mock = vi.hoisted(() => ({
  mode: "success" as "success" | "copy-race",
  headCount: 0,
  calls: [] as Array<{ name: string; input: Record<string, unknown> }>,
  send: vi.fn(async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
    const name = command.constructor.name;
    r2Mock.calls.push({ name, input: command.input });
    if (name === "HeadObjectCommand") {
      r2Mock.headCount += 1;
      return {
        ContentType: "image/webp",
        ContentLength: 12,
        ETag: r2Mock.headCount === 1 ? '"verified-etag"' : '"final-etag"',
      };
    }
    if (name === "GetObjectCommand") {
      return { Body: { transformToByteArray: async () => new TextEncoder().encode("RIFF\0\0\0\0WEBP") } };
    }
    if (name === "CopyObjectCommand" && r2Mock.mode === "copy-race") {
      throw Object.assign(new Error("precondition failed"), { $metadata: { httpStatusCode: 412 } });
    }
    return {};
  }),
}));

vi.mock("./client", () => ({
  getR2Client: () => ({ send: r2Mock.send }),
}));

import { verifyUploadedObject } from "./uploads";

const finalObjectKey = "covers/00000000-0000-4000-8000-000000000001.webp";
const stagingObjectKey = `staging/${finalObjectKey}`;

beforeEach(() => {
  r2Mock.mode = "success";
  r2Mock.headCount = 0;
  r2Mock.calls.length = 0;
  r2Mock.send.mockClear();
  vi.stubEnv("R2_ACCOUNT_ID", "testaccount");
  vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
  vi.stubEnv("R2_BUCKET_NAME", "test-bucket");
});

describe("staging promotion", () => {
  it("binds ranged verification and copy to the HEAD ETag", async () => {
    const verified = await verifyUploadedObject({
      actor: { id: "00000000-0000-4000-8000-000000000002", role: "ADMIN", status: "ACTIVE" },
      stagingObjectKey,
      finalObjectKey,
      expectedContentType: "image/webp",
      expectedContentLength: 12,
    });

    const rangedGet = r2Mock.calls.find((call) => call.name === "GetObjectCommand");
    const copy = r2Mock.calls.find((call) => call.name === "CopyObjectCommand");
    expect(rangedGet?.input).toMatchObject({ Range: "bytes=0-63", IfMatch: '"verified-etag"' });
    expect(copy?.input).toMatchObject({
      Key: finalObjectKey,
      CopySource: `test-bucket/${stagingObjectKey}`,
      CopySourceIfMatch: '"verified-etag"',
    });
    expect(verified.objectKey).toBe(finalObjectKey);
    expect(verified.stagingDeleted).toBe(true);
  });

  it("maps a copy precondition race to rejection and removes staging", async () => {
    r2Mock.mode = "copy-race";
    const operation = verifyUploadedObject({
      actor: { id: "00000000-0000-4000-8000-000000000002", role: "ADMIN", status: "ACTIVE" },
      stagingObjectKey,
      finalObjectKey,
      expectedContentType: "image/webp",
      expectedContentLength: 12,
    });

    await expect(operation).rejects.toMatchObject({
      code: "UPLOAD_CONTENT_MISMATCH",
      objectDeleted: true,
    });
    expect(r2Mock.calls.some((call) => call.name === "DeleteObjectCommand")).toBe(true);
  });
});
