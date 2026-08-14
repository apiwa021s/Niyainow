import { describe, expect, it } from "vitest";

import {
  generateObjectKey,
  generateStagingObjectKey,
  managedObjectKeySchema,
  MAX_UPLOAD_BYTES,
  objectKeySchema,
  stagingObjectKeySchema,
  uploadRequestSchema,
} from "./upload";

describe("R2 upload validation", () => {
  it("accepts a bounded image and creates an object key without the original name", () => {
    const upload = uploadRequestSchema.parse({
      assetType: "cover",
      originalFileName: "unsafe user title.webp",
      contentType: "image/webp",
      contentLength: 512_000,
    });
    const key = generateObjectKey(upload);

    expect(key).toMatch(/^covers\/[0-9a-f-]+\.webp$/);
    expect(key).not.toContain("unsafe");
    expect(objectKeySchema.safeParse(key).success).toBe(true);

    const stagingKey = generateStagingObjectKey(key);
    expect(stagingKey).toBe(`staging/${key}`);
    expect(stagingObjectKeySchema.safeParse(stagingKey).success).toBe(true);
    expect(managedObjectKeySchema.safeParse(stagingKey).success).toBe(true);
    expect(objectKeySchema.safeParse(stagingKey).success).toBe(false);
  });

  it("rejects a MIME/extension mismatch and oversized file", () => {
    const result = uploadRequestSchema.safeParse({
      assetType: "avatar",
      originalFileName: "avatar.exe",
      contentType: "image/png",
      contentLength: MAX_UPLOAD_BYTES.avatar + 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues).toHaveLength(2);
  });

  it("rejects URLs and path traversal in persisted keys", () => {
    expect(objectKeySchema.safeParse("https://bucket.example/covers/a.webp").success).toBe(false);
    expect(objectKeySchema.safeParse("covers/../secret.webp").success).toBe(false);
  });
});
