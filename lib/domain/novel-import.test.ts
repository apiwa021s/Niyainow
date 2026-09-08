import { describe, expect, it } from "vitest";

import {
  languageTagSchema,
  novelImportChapterBatchInputSchema,
  novelImportSourceInputSchema,
} from "./novel-import";

const sourceInput = {
  provider: "mvlempyr",
  externalWorkId: "work-123",
  seedUrl: "https://example.test/novel/work-123",
  originalTitle: "Example story",
};

describe("novel import contract", () => {
  it("canonicalizes BCP 47 language tags", () => {
    expect(languageTagSchema.parse("ZH-hant-tw")).toBe("zh-Hant-TW");
  });

  it("defaults a source to English and accepts independent localizations", () => {
    const result = novelImportSourceInputSchema.parse({
      ...sourceInput,
      localizations: [
        { language: "th", title: "เรื่องตัวอย่าง" },
        { language: "ja-JP", title: "サンプル物語", status: "reviewed" },
      ],
    });

    expect(result.sourceLanguage).toBe("en");
    expect(result.localizations).toMatchObject([
      { language: "th", status: "draft" },
      { language: "ja-JP", status: "reviewed" },
    ]);
  });

  it("rejects duplicate and source-language localizations after canonicalization", () => {
    const result = novelImportSourceInputSchema.safeParse({
      ...sourceInput,
      sourceLanguage: "en-US",
      localizations: [
        { language: "EN-us", title: "Same language" },
        { language: "th", title: "หนึ่ง" },
        { language: "TH", title: "สอง" },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a multilingual chapter batch", () => {
    const result = novelImportChapterBatchInputSchema.parse({
      provider: "mvlempyr",
      externalWorkId: "work-123",
      chapters: [{
        chapterNumber: 1,
        sourceUrl: "https://example.test/novel/work-123/chapter-1",
        originalTitle: "Chapter 1",
        originalText: "Original content",
        sourceLanguage: "en",
        fetchedAt: "2026-09-08T12:00:00+07:00",
        translations: [
          { language: "th", title: "ตอนที่ 1", content: "เนื้อหา", status: "draft" },
          { language: "ja", content: "本文", status: "approved" },
        ],
      }],
    });

    expect(result.chapters[0].translations.map(({ language }) => language)).toEqual(["th", "ja"]);
  });

  it("rejects insecure remote URLs and duplicate chapters", () => {
    expect(novelImportSourceInputSchema.safeParse({
      ...sourceInput,
      seedUrl: "http://example.test/story",
    }).success).toBe(false);

    const chapter = {
      chapterNumber: 1,
      sourceUrl: "https://example.test/chapter-1",
      originalTitle: "Chapter 1",
      originalText: "Original content",
      fetchedAt: "2026-09-08T05:00:00Z",
    };
    expect(novelImportChapterBatchInputSchema.safeParse({
      provider: "mvlempyr",
      externalWorkId: "work-123",
      chapters: [chapter, chapter],
    }).success).toBe(false);
  });
});
