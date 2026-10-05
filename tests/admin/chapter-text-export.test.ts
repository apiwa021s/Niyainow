import { strFromU8, strToU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildChapterTextArchive, chapterTextFilename } from "@/lib/admin/chapter-text-export";

describe("chapter text export", () => {
  it("pads chapter numbers and removes unsafe filename characters", () => {
    expect(chapterTextFilename({ chapterNumber: 1, title: "บทนำ" })).toBe("001-บทนำ.txt");
    expect(chapterTextFilename({ chapterNumber: 2.5, title: "เดินทาง: ตอนแรก?" })).toBe("002.5-เดินทาง- ตอนแรก-.txt");
  });

  it("limits UTF-8 filename bytes so Windows can open archives with long Thai titles", () => {
    const chapter = {
      chapterNumber: 213,
      title: "บทที่ 22 วางหมากหนึ่งเม็ดบัญชาการทั่วหล้า มหาปรมาจารย์ (อัปเดตเพิ่มตั๋วรายเดือน 15–16) ตอนที่ 3",
      content: "เนื้อหาตอนที่ 213",
    };
    const filename = chapterTextFilename(chapter);

    expect(strToU8(filename).length).toBeLessThanOrEqual(240);
    expect(filename).toMatch(/^213-.+\.txt$/);
    expect(filename).not.toContain("\uFFFD");
    const files = unzipSync(buildChapterTextArchive([chapter]));
    expect(Object.keys(files)).toEqual([filename]);
    expect(strFromU8(files[filename])).toBe(chapter.content);
  });

  it("preserves complete Unicode characters when truncating a filename", () => {
    const filename = chapterTextFilename({ chapterNumber: 2.5, title: "🐉".repeat(100) });
    const title = filename.slice("002.5-".length, -".txt".length);

    expect(strToU8(filename).length).toBeLessThanOrEqual(240);
    expect(title).toBe("🐉".repeat(Array.from(title).length));
  });

  it("creates separate UTF-8 text files in a zip archive", () => {
    const archive = buildChapterTextArchive([
      { chapterNumber: 1, title: "บทนำ", content: "สวัสดี\r\nโลก" },
      { chapterNumber: 2, title: "การเดินทาง", content: "เนื้อหาตอนสอง" },
    ]);

    const files = unzipSync(archive);
    expect(Object.keys(files)).toEqual(["001-บทนำ.txt", "002-การเดินทาง.txt"]);
    expect(Array.from(files["001-บทนำ.txt"].slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(Array.from(files["002-การเดินทาง.txt"].slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(strFromU8(files["001-บทนำ.txt"])).toBe("สวัสดี\nโลก");
    expect(strFromU8(files["002-การเดินทาง.txt"])).toBe("เนื้อหาตอนสอง");
  });
});
