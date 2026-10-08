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
    expect(readTranslationJobMetadata({})).toMatchObject({ operation: "TRANSLATE", executionMode: "STANDARD", autoPublish: false });
    expect(chapterStatusAfterCancelledJob({ version: 1 })).toBe("READY");
  });

  it("keeps legacy polish metadata in standard mode", () => {
    const legacyJob = {
      operation: "POLISH",
      baseTranslationVersionId: "00000000-0000-4000-8000-000000000001",
      previousChapterStatus: "APPROVED",
    };

    expect(readTranslationJobMetadata({ job: legacyJob })).toEqual({ ...legacyJob, executionMode: "STANDARD", autoPublish: false });
    expect(chapterStatusAfterCancelledJob({ job: legacyJob })).toBe("APPROVED");
  });

  it("persists the selected economy mode across checkpoint updates", () => {
    const job = createTranslationJobMetadata({ executionMode: "ECONOMY" });
    expect(readTranslationJobMetadata({ job, translation: { title: "draft", content: "draft" } })).toEqual(job);
    expect(job.executionMode).toBe("ECONOMY");
    expect(createTranslationJobMetadata().executionMode).toBe("STANDARD");
  });

  it("preserves the explicit publication choice through every job checkpoint", () => {
    const job = createTranslationJobMetadata({ executionMode: "ECONOMY", autoPublish: true });
    expect(readTranslationJobMetadata(JSON.parse(JSON.stringify({ job })))).toEqual(job);
    expect(createTranslationJobMetadata().autoPublish).toBe(false);
    expect(readTranslationJobMetadata({ job: { ...job, autoPublish: "true" } }).autoPublish).toBe(false);
  });
});
