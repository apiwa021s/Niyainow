import { describe, expect, it } from "vitest";

import { ImportedCoverError, importedCoverObjectKey, validateImportedCoverUrl } from "./import-cover";

describe("imported cover URL policy", () => {
  it("allows the configured HTTPS asset host for a provider", () => {
    expect(validateImportedCoverUrl(
      "mvlempyr",
      "https://assets.mvlempyr.app/images/900/5117.webp",
    ).hostname).toBe("assets.mvlempyr.app");
  });

  it("blocks unknown hosts, credentials, ports, and providers", () => {
    for (const [provider, url] of [
      ["mvlempyr", "https://example.com/cover.webp"],
      ["mvlempyr", "https://user:pass@assets.mvlempyr.app/cover.webp"],
      ["mvlempyr", "https://assets.mvlempyr.app:8443/cover.webp"],
      ["unknown", "https://assets.mvlempyr.app/cover.webp"],
    ]) {
      expect(() => validateImportedCoverUrl(provider, url)).toThrow(ImportedCoverError);
    }
  });

  it("keeps retries idempotent and changes the object key when the source URL changes", () => {
    const first = importedCoverObjectKey(
      "d42f7c67-2e09-4bd2-9721-12cc374f9060",
      "https://assets.mvlempyr.app/images/900/5117.webp",
      "image/webp",
    );
    expect(importedCoverObjectKey(
      "d42f7c67-2e09-4bd2-9721-12cc374f9060",
      "https://assets.mvlempyr.app/images/900/5117.webp",
      "image/webp",
    )).toBe(first);
    expect(importedCoverObjectKey(
      "d42f7c67-2e09-4bd2-9721-12cc374f9060",
      "https://assets.mvlempyr.app/images/900/5117-v2.webp",
      "image/webp",
    )).not.toBe(first);
  });
});
