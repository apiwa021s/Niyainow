import { describe, expect, it } from "vitest";

import {
  missingImportedChapterNumbers,
  mapImportedTagSlugs,
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

  it("allocates unique slugs when different Thai tags retain the same ASCII digits", () => {
    const tagNames = ["#ย้อนยุค80", "#โรแมนติกยุค80"];

    const rows = mapImportedTagSlugs(tagNames);

    expect(rows[0]).toEqual({ name: tagNames[0], slug: "80" });
    expect(rows[1].name).toBe(tagNames[1]);
    expect(rows[1].slug).toMatch(/^80-[a-f0-9]{12}$/u);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(tagNames.length);
    expect(mapImportedTagSlugs(tagNames)).toEqual(rows);
  });

  it("keeps collision-safe imported tag slugs within the database column limit", () => {
    const sharedPrefix = "a".repeat(159);
    const rows = mapImportedTagSlugs([`${sharedPrefix}x`, `${sharedPrefix}y`]);

    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.slug)).size).toBe(2);
    expect(rows.every((row) => row.slug.length <= 120)).toBe(true);
    expect(rows.every((row) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(row.slug))).toBe(true);
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

  it("accepts chapter output above the old four MiB budget", () => {
    const result = normalizeImportedChapterContent("x".repeat(4 * 1024 * 1024 + 1));

    expect(result.reason).toBeNull();
    expect(result.content).toHaveLength(4 * 1024 * 1024 + 1);
  });

  it("still reports content that exceeds the configured safety budget", () => {
    const result = normalizeImportedChapterContent("1234", 3);

    expect(result).toEqual({ content: null, reason: "too_large" });
  });

  it("finds chapter-number holes even when later chapters already exist", () => {
    expect(missingImportedChapterNumbers(0, 6, [1, 3, 4, 6])).toEqual([2, 5]);
    expect(missingImportedChapterNumbers(100, 3, [101, 103])).toEqual([102]);
  });
});
