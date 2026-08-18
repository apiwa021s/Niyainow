import { describe, expect, it } from "vitest";

import {
  isRetryableMongoSyncFailure,
  mergeMongoSyncSummaries,
  mongoSyncCursorFingerprint,
  shouldContinueMongoAutoSync,
  type MongoSyncLoopStatus,
  type MongoSyncSummary,
} from "@/lib/domain/mongo-sync";

function summary(overrides: Partial<MongoSyncSummary> = {}): MongoSyncSummary {
  return {
    dryRun: false,
    mode: "backfill",
    selectedBooks: 0,
    completedBooks: 0,
    partialBooks: 0,
    importedChapters: 0,
    paidChapters: 0,
    skippedChapters: 0,
    processedSourceChapters: 0,
    coverCandidates: 0,
    uploadedCovers: 0,
    skippedCovers: 0,
    stoppedForRuntime: false,
    backfillComplete: false,
    repairComplete: false,
    incrementalDue: false,
    nextAfterBookId: null,
    currentBookId: null,
    currentChapterOffset: null,
    ...overrides,
  };
}

function loopStatus(overrides: {
  backfill?: Partial<MongoSyncLoopStatus["backfill"]>;
  incremental?: Partial<MongoSyncLoopStatus["incremental"]>;
  repair?: Partial<MongoSyncLoopStatus["repair"]>;
} = {}): MongoSyncLoopStatus {
  return {
    backfill: {
      completed: false,
      afterBookId: null,
      currentBookId: null,
      chapterOffset: 0,
      ...overrides.backfill,
    },
    incremental: {
      active: false,
      afterUpdatedAt: null,
      afterBookId: null,
      currentBookId: null,
      chapterOffset: 0,
      sweepUntil: null,
      ...overrides.incremental,
    },
    repair: {
      active: false,
      afterBookId: null,
      currentBookId: null,
      chapterOffset: 0,
      ...overrides.repair,
    },
  };
}

describe("shouldContinueMongoAutoSync", () => {
  it("continues incomplete backfill after a partial chapter chunk", () => {
    const status = loopStatus({ backfill: { currentBookId: "book-1", chapterOffset: 100 } });
    const result = summary({ partialBooks: 1, currentBookId: "book-1", currentChapterOffset: 100 });

    expect(shouldContinueMongoAutoSync(status, result)).toBe(true);
  });

  it("continues incomplete backfill after the runtime guard stops a batch", () => {
    expect(shouldContinueMongoAutoSync(loopStatus(), summary({ stoppedForRuntime: true }))).toBe(true);
  });

  it("stops after backfill completion", () => {
    const status = loopStatus({ backfill: { completed: true, afterBookId: "book-9" } });

    expect(shouldContinueMongoAutoSync(status, summary({ backfillComplete: true }))).toBe(false);
  });

  it("continues only an active incremental sweep after backfill", () => {
    const active = loopStatus({
      backfill: { completed: true },
      incremental: { active: true, currentBookId: "book-10", chapterOffset: 200 },
    });

    expect(shouldContinueMongoAutoSync(active, summary({ mode: "incremental", incrementalDue: true }))).toBe(true);
    expect(shouldContinueMongoAutoSync(active, summary({ mode: "backfill" }))).toBe(false);
    expect(
      shouldContinueMongoAutoSync(
        loopStatus({ backfill: { completed: true }, incremental: { active: false } }),
        summary({ mode: "incremental" }),
      ),
    ).toBe(false);
  });

  it("continues a repair sweep only while its dedicated cursor is active", () => {
    const active = loopStatus({
      backfill: { completed: true },
      repair: { active: true, currentBookId: "book-20", chapterOffset: 100 },
    });
    const complete = loopStatus({ backfill: { completed: true } });

    expect(shouldContinueMongoAutoSync(active, summary({ mode: "repair" }))).toBe(true);
    expect(shouldContinueMongoAutoSync(complete, summary({ mode: "repair", repairComplete: true }))).toBe(false);
  });
});

describe("mergeMongoSyncSummaries", () => {
  it("sums work counters and preserves the latest cursor and status", () => {
    const current = summary({
      selectedBooks: 1,
      completedBooks: 1,
      importedChapters: 80,
      paidChapters: 5,
      processedSourceChapters: 80,
      coverCandidates: 1,
      uploadedCovers: 1,
      nextAfterBookId: "book-1",
    });
    const next = summary({
      mode: "incremental",
      selectedBooks: 1,
      partialBooks: 1,
      importedChapters: 20,
      paidChapters: 2,
      skippedChapters: 1,
      processedSourceChapters: 21,
      coverCandidates: 1,
      skippedCovers: 1,
      stoppedForRuntime: true,
      incrementalDue: true,
      nextAfterBookId: "book-2",
      currentBookId: "book-3",
      currentChapterOffset: 100,
    });

    expect(mergeMongoSyncSummaries(current, next)).toEqual({
      ...next,
      selectedBooks: 2,
      completedBooks: 1,
      partialBooks: 1,
      importedChapters: 100,
      paidChapters: 7,
      skippedChapters: 1,
      processedSourceChapters: 101,
      coverCandidates: 2,
      uploadedCovers: 1,
      skippedCovers: 1,
    });
  });

  it("starts an accumulation from the first result", () => {
    const first = summary({ importedChapters: 25, currentBookId: "book-1" });

    expect(mergeMongoSyncSummaries(null, first)).toEqual(first);
    expect(mergeMongoSyncSummaries(null, first)).not.toBe(first);
  });
});

describe("mongoSyncCursorFingerprint", () => {
  it("is stable for the same cursor and changes when either cursor advances", () => {
    const initial = loopStatus({ backfill: { currentBookId: "book-1", chapterOffset: 100 } });
    const same = loopStatus({ backfill: { currentBookId: "book-1", chapterOffset: 100 } });
    const nextBackfillChunk = loopStatus({ backfill: { currentBookId: "book-1", chapterOffset: 200 } });
    const incremental = loopStatus({
      backfill: { completed: true, afterBookId: "book-9" },
      incremental: {
        active: true,
        currentBookId: "book-10",
        chapterOffset: 100,
        sweepUntil: "2026-08-14T00:00:00.000Z",
      },
    });

    expect(mongoSyncCursorFingerprint(initial)).toBe(mongoSyncCursorFingerprint(same));
    expect(mongoSyncCursorFingerprint(nextBackfillChunk)).not.toBe(mongoSyncCursorFingerprint(initial));
    expect(mongoSyncCursorFingerprint(incremental)).not.toBe(mongoSyncCursorFingerprint(initial));
  });

  it("changes as the repair cursor advances", () => {
    const first = loopStatus({ repair: { active: true, currentBookId: "book-1", chapterOffset: 100 } });
    const second = loopStatus({ repair: { active: true, currentBookId: "book-1", chapterOffset: 200 } });

    expect(mongoSyncCursorFingerprint(second)).not.toBe(mongoSyncCursorFingerprint(first));
  });

  it("changes after each completed incremental book even when no book is partial", () => {
    const first = loopStatus({
      backfill: { completed: true },
      incremental: {
        active: true,
        afterUpdatedAt: "2026-08-14T10:00:00.000Z",
        afterBookId: "book-010",
      },
    });
    const second = loopStatus({
      backfill: { completed: true },
      incremental: {
        active: true,
        afterUpdatedAt: "2026-08-14T10:05:00.000Z",
        afterBookId: "book-011",
      },
    });

    expect(mongoSyncCursorFingerprint(second)).not.toBe(mongoSyncCursorFingerprint(first));
  });
});

describe("isRetryableMongoSyncFailure", () => {
  it.each([
    [408, undefined],
    [409, "SYNC_ALREADY_RUNNING"],
    [425, undefined],
    [429, undefined],
    [500, undefined],
    [503, undefined],
    [599, undefined],
  ])("retries HTTP %s with code %s", (status, code) => {
    expect(isRetryableMongoSyncFailure(status, code)).toBe(true);
  });

  it.each([
    [undefined, undefined],
    [400, undefined],
    [401, undefined],
    [403, undefined],
    [404, undefined],
    [409, undefined],
    [409, "OTHER_CONFLICT"],
    [499, undefined],
    [600, undefined],
  ])("does not retry HTTP %s with code %s", (status, code) => {
    expect(isRetryableMongoSyncFailure(status, code)).toBe(false);
  });
});
