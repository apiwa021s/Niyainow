import { describe, expect, it } from "vitest";

import {
  READER_AVATAR_MAX_BYTES,
  isReaderAvatarContentType,
  validateReaderAvatarFile,
} from "./reader-avatar";

describe("reader avatar upload contract", () => {
  it("accepts the supported production image formats", () => {
    expect(isReaderAvatarContentType("image/jpeg")).toBe(true);
    expect(isReaderAvatarContentType("image/avif")).toBe(true);
    expect(validateReaderAvatarFile({ type: "image/webp", size: READER_AVATAR_MAX_BYTES })).toBeNull();
  });

  it("rejects unsupported or empty files", () => {
    expect(isReaderAvatarContentType("image/svg+xml")).toBe(false);
    expect(validateReaderAvatarFile({ type: "image/svg+xml", size: 100 })).toMatch(/JPG/);
    expect(validateReaderAvatarFile({ type: "image/png", size: 0 })).toMatch(/2 MB/);
  });

  it("rejects files over the profile-specific limit", () => {
    expect(validateReaderAvatarFile({
      type: "image/png",
      size: READER_AVATAR_MAX_BYTES + 1,
    })).toMatch(/2 MB/);
  });
});
