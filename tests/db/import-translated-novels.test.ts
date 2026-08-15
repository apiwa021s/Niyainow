import { describe, expect, it } from "vitest";

import {
  mapImportedChapterAccess,
  normalizeImportedChapterContent,
} from "@/db/import-translated-novels";

describe("translated novel import", () => {
  it("imports paid Mongo chapters as one-coin Postgres chapters", () => {
    expect(mapImportedChapterAccess(20)).toEqual({ isFree: false, coinPrice: 1 });
    expect(mapImportedChapterAccess(1)).toEqual({ isFree: false, coinPrice: 1 });
  });

  it("keeps free or malformed Mongo prices free", () => {
    expect(mapImportedChapterAccess(0)).toEqual({ isFree: true, coinPrice: 0 });
    expect(mapImportedChapterAccess(null)).toEqual({ isFree: true, coinPrice: 0 });
  });

  it("normalizes entity-heavy chapter HTML without chained replacement ropes", () => {
    const source = "&nbsp;&amp;".repeat(500_000);

    const result = normalizeImportedChapterContent(source);

    expect(result.reason).toBeNull();
    expect(result.content).toHaveLength(999_999);
    expect(result.content?.startsWith("& & &")).toBe(true);
  });

  it("preserves the importer's HTML and whitespace normalization semantics", () => {
    const result = normalizeImportedChapterContent(
      "  <p>Hello&nbsp;&amp;\tworld<br/>Line</p>\n\n\n&lt;end&gt;  ",
    );

    expect(result).toEqual({ content: "Hello & world\nLine\n\n<end>", reason: null });
  });

  it("rejects normalized chapter output above the four MiB budget", () => {
    const result = normalizeImportedChapterContent("x".repeat(4 * 1024 * 1024 + 1));

    expect(result).toEqual({ content: null, reason: "too_large" });
  });
});
