import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";

import { buildChapterTextArchive, chapterTextFilename } from "@/lib/admin/chapter-text-export";

describe("chapter text export", () => {
  it("pads chapter numbers and removes unsafe filename characters", () => {
    expect(chapterTextFilename({ chapterNumber: 1, title: "บทนำ" })).toBe("001-บทนำ.txt");
    expect(chapterTextFilename({ chapterNumber: 2.5, title: "เดินทาง: ตอนแรก?" })).toBe("002.5-เดินทาง- ตอนแรก-.txt");
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
