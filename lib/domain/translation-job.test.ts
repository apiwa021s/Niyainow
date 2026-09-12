import { describe, expect, it } from "vitest";

import {
  chapterStatusAfterCancelledJob,
  createTranslationJobMetadata,
  readTranslationJobMetadata,
} from "./translation-job";

describe("translation job metadata", () => {
  it("keeps the previous chapter state for a polish job", () => {
    const job = createTranslationJobMetadata({
      operation: "POLISH",
      baseTranslationVersionId: "00000000-0000-4000-8000-000000000001",
      previousChapterStatus: "PUBLISHED",
    });
    const checkpoint = { job };

    expect(readTranslationJobMetadata(checkpoint)).toEqual(job);
    expect(chapterStatusAfterCancelledJob(checkpoint)).toBe("PUBLISHED");
  });

  it("falls back safely for legacy translation checkpoints", () => {
    expect(readTranslationJobMetadata({})).toMatchObject({ operation: "TRANSLATE" });
    expect(chapterStatusAfterCancelledJob({ version: 1 })).toBe("READY");
  });
});
