import { describe, expect, it } from "vitest";

import { parseChapterLabel, parseCombinedChapters } from "@/lib/admin/chapter-import";

describe("chapter bulk import parsing", () => {
  it("extracts chapter numbers and titles from Thai and English filenames", () => {
    expect(parseChapterLabel("ตอนที่ 12 - คืนหิมะ.txt", 1)).toEqual({ chapterNumber: 12, title: "คืนหิมะ" });
    expect(parseChapterLabel("Chapter 12.5_Interlude.md", 1)).toEqual({ chapterNumber: 12.5, title: "Interlude" });
  });

  it("falls back to the supplied number when a filename has no number", () => {
    expect(parseChapterLabel("บทนำ.txt", 7)).toEqual({ chapterNumber: 7, title: "บทนำ" });
  });

  it("splits a combined manuscript without keeping headings in content", () => {
    expect(parseCombinedChapters("## ตอนที่ 1 - เริ่มต้น\nเนื้อหาแรก\n\nChapter 2: Next\nSecond body")).toEqual([
      { chapterNumber: 1, title: "เริ่มต้น", content: "เนื้อหาแรก" },
      { chapterNumber: 2, title: "Next", content: "Second body" },
    ]);
  });

  it("returns no chapters when no supported heading exists", () => {
    expect(parseCombinedChapters("เนื้อหาอย่างเดียว")).toEqual([]);
  });
});
