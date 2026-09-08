import { describe, expect, it } from "vitest";

import { isWriterModeApiPath, isWriterModeEnabled, isWriterModePagePath } from "./writer-mode";

describe("writer mode feature gate", () => {
  it("is disabled by default and requires an explicit true value", () => {
    expect(isWriterModeEnabled({ NODE_ENV: "test" })).toBe(false);
    expect(isWriterModeEnabled({ NODE_ENV: "test", WRITER_MODE_ENABLED: "true" })).toBe(true);
    expect(isWriterModeEnabled({ NODE_ENV: "test", WRITER_MODE_ENABLED: "false" })).toBe(false);
  });

  it("covers Studio pages and creator applications without hiding public profiles", () => {
    expect(isWriterModePagePath("/studio")).toBe(true);
    expect(isWriterModePagePath("/studio/works/new")).toBe(true);
    expect(isWriterModePagePath("/creators/apply")).toBe(true);
    expect(isWriterModePagePath("/creators/some-writer")).toBe(false);
  });

  it("covers only the private Studio API namespace", () => {
    expect(isWriterModeApiPath("/api/studio/stories")).toBe(true);
    expect(isWriterModeApiPath("/api/writers/some-writer")).toBe(false);
  });
});
