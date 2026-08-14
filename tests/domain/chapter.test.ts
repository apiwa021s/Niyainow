import { describe, expect, it } from "vitest";

import {
  countChapterWords,
  isPublicChapter,
  parseChapterNumberSegment,
  splitChapterParagraphs,
} from "@/lib/domain/chapter";

describe("chapter domain", () => {
  it("segments Thai words and normalizes paragraphs", () => {
    expect(countChapterWords("นักอ่าน เปิดประตู สู่โลกใหม่")).toBeGreaterThan(3);
    expect(splitChapterParagraphs("ย่อหน้าแรก\r\n\r\n  ย่อหน้าที่สอง  ")).toEqual(["ย่อหน้าแรก", "ย่อหน้าที่สอง"]);
  });

  it("only exposes published, non-deleted chapters after publication time", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    expect(isPublicChapter({ status: "PUBLISHED", publishedAt: new Date("2026-08-13T00:00:00.000Z") }, now)).toBe(true);
    expect(isPublicChapter({ status: "DRAFT", publishedAt: null }, now)).toBe(false);
    expect(isPublicChapter({ status: "PUBLISHED", publishedAt: new Date("2026-08-15T00:00:00.000Z") }, now)).toBe(false);
    expect(
      isPublicChapter(
        { status: "PUBLISHED", publishedAt: new Date("2026-08-13T00:00:00.000Z"), deletedAt: now },
        now,
      ),
    ).toBe(false);
  });

  it("accepts canonical decimal chapter numbers and identifies safe aliases", () => {
    expect(parseChapterNumberSegment("10.5")).toEqual({ number: 10.5, canonical: "10.5", isCanonical: true });
    expect(parseChapterNumberSegment("1.0")).toEqual({ number: 1, canonical: "1", isCanonical: false });
    for (const invalid of ["01", "1e0", "0x1", "+1", "1.234", "999999999.99"]) {
      expect(parseChapterNumberSegment(invalid)).toBeNull();
    }
  });
});
