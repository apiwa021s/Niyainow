import { describe, expect, it } from "vitest";

import { hasValidNovelImportAuthorization } from "./novel-import-auth";

const expectedToken = "test-import-token-with-at-least-32-characters";

describe("novel import bearer authentication", () => {
  it("accepts only an exact bearer token", () => {
    const request = new Request("https://example.test/api/internal/novel-import/sources", {
      headers: { authorization: `Bearer ${expectedToken}` },
    });
    expect(hasValidNovelImportAuthorization(request, expectedToken)).toBe(true);
  });

  it("rejects a missing, malformed, or incorrect token", () => {
    const url = "https://example.test/api/internal/novel-import/sources";
    expect(hasValidNovelImportAuthorization(new Request(url), expectedToken)).toBe(false);
    expect(hasValidNovelImportAuthorization(new Request(url, {
      headers: { authorization: `Basic ${expectedToken}` },
    }), expectedToken)).toBe(false);
    expect(hasValidNovelImportAuthorization(new Request(url, {
      headers: { authorization: "Bearer a-different-token" },
    }), expectedToken)).toBe(false);
  });
});
