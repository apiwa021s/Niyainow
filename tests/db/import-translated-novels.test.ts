import { describe, expect, it } from "vitest";

import {
  assertTranslatedNovelIncrementalReady,
  assertTranslatedNovelImportLeaseAvailable,
  assertTranslatedNovelImportLeaseOwner,
  clearMissingTranslatedNovelIncrementalCursor,
  clearMissingTranslatedNovelBackfillCursor,
  completeTranslatedNovelIncrementalBook,
  getTranslatedNovelBackfillBookIdWindow,
  getTranslatedNovelIncrementalLowerBound,
  inspectTranslatedNovelImportLease,
  initializeMongoSourceIdentityCursor,
  type ImportCursorState,
  mapImportedChapterAccess,
  normalizeTranslatedNovelImportCursor,
  planMongoImportedChapterIdentity,
  planMongoImportedNovelIdentity,
  readBoundedMongoCoverBody,
  resolveTranslatedNovelIncrementalOrderingTimestamp,
  shouldRequireLegacyMongoNovelIdentity,
  TranslatedNovelImportLeaseError,
  TranslatedNovelImportStateError,
  validateMongoImportSourceId,
  validateMongoImportSourceIds,
  validateMongoCoverContentLength,
  validateMongoCoverUrl,
} from "@/db/import-translated-novels";

function expectErrorCode(action: () => unknown, code: string) {
  try {
    action();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toMatchObject({ code });
  }
}

describe("translated novel import", () => {
  it("imports paid Mongo chapters as one-coin Postgres chapters", () => {
    expect(mapImportedChapterAccess(20)).toEqual({ isFree: false, coinPrice: 1 });
    expect(mapImportedChapterAccess(1)).toEqual({ isFree: false, coinPrice: 1 });
  });

  it("keeps free or malformed Mongo prices free", () => {
    expect(mapImportedChapterAccess(0)).toEqual({ isFree: true, coinPrice: 0 });
    expect(mapImportedChapterAccess(null)).toEqual({ isFree: true, coinPrice: 0 });
  });

  it("clears a missing partial book and resumes strictly after the completed cursor", () => {
    const state = {
      afterBookId: "book-010",
      currentBookId: "book-011",
      chapterOffset: 75,
      backfillHighWaterBookId: "book-100",
    };

    expect(clearMissingTranslatedNovelBackfillCursor(state)).toEqual({
      afterBookId: "book-010",
      backfillHighWaterBookId: "book-100",
    });
    expect(getTranslatedNovelBackfillBookIdWindow(state)).toEqual({
      $gt: "book-010",
      $lte: "book-100",
    });
  });

  it("stops at the captured high-water mark instead of wrapping to the first book", () => {
    expect(
      getTranslatedNovelBackfillBookIdWindow({
        afterBookId: "book-100",
        backfillHighWaterBookId: "book-100",
      }),
    ).toBeNull();
    expect(getTranslatedNovelBackfillBookIdWindow({ backfillHighWaterBookId: null })).toBeNull();
  });

  it("retains the high-water mark and snapshot start when normalizing persisted cursors", () => {
    expect(normalizeTranslatedNovelImportCursor({
      backfillHighWaterBookId: "book-100",
      backfillStartedAt: "2026-08-14T00:00:00.000Z",
    })).toMatchObject({
      backfillHighWaterBookId: "book-100",
      backfillStartedAt: "2026-08-14T00:00:00.000Z",
    });
    expect(normalizeTranslatedNovelImportCursor({ backfillHighWaterBookId: null })).toHaveProperty(
      "backfillHighWaterBookId",
      null,
    );
  });

  it("reports an active lease with bounded retry metadata and rejects a competing run", () => {
    const now = new Date("2026-08-14T10:00:00.000Z");
    const value = {
      owner: "worker-a",
      acquiredAt: "2026-08-14T09:59:00.000Z",
      expiresAt: "2026-08-14T10:00:31.000Z",
    };

    expect(inspectTranslatedNovelImportLease(value, now)).toEqual({
      running: true,
      leaseExpiresAt: value.expiresAt,
      retryAfterSeconds: 31,
    });
    expect(() => assertTranslatedNovelImportLeaseAvailable(value, now)).toThrowError(
      TranslatedNovelImportLeaseError,
    );
    expect(() => assertTranslatedNovelImportLeaseAvailable(value, now)).toThrowError(
      expect.objectContaining({ code: "SYNC_ALREADY_RUNNING", retryAfterSeconds: 31 }),
    );
  });

  it("fences checkpoints by owner and expiry", () => {
    const now = new Date("2026-08-14T10:00:00.000Z");
    const value = {
      owner: "worker-a",
      acquiredAt: "2026-08-14T09:59:00.000Z",
      expiresAt: "2026-08-14T10:01:00.000Z",
    };

    expect(assertTranslatedNovelImportLeaseOwner(value, "worker-a", now)).toEqual(value);
    expect(() => assertTranslatedNovelImportLeaseOwner(value, "worker-b", now)).toThrowError(
      expect.objectContaining({ code: "SYNC_LEASE_LOST" }),
    );
    expect(() =>
      assertTranslatedNovelImportLeaseOwner(value, "worker-a", new Date(value.expiresAt)),
    ).toThrowError(expect.objectContaining({ code: "SYNC_LEASE_LOST" }));
  });

  it("validates and deduplicates Mongo source IDs before persistence", () => {
    expect(validateMongoImportSourceId("book-001", "bookId")).toBe("book-001");
    expectErrorCode(() => validateMongoImportSourceId(" book-001", "bookId"), "SYNC_INVALID_SOURCE_ID");
    expectErrorCode(() => validateMongoImportSourceId("chapter\u0000id", "chapterId"), "SYNC_INVALID_SOURCE_ID");
    expectErrorCode(
      () => validateMongoImportSourceIds(["chapter-1", "chapter-1"], "chapterId"),
      "SYNC_DUPLICATE_SOURCE_ID",
    );
  });

  it("resolves novels by Mongo ID and preserves the existing slug across title changes", () => {
    const mapped = {
      id: "novel-1",
      mongoBookId: "book-001",
      slug: "stable-public-slug",
      title: "Old title",
      coverKey: null,
    };
    expect(
      planMongoImportedNovelIdentity({
        mongoBookId: "book-001",
        title: "Renamed source title",
        legacySlug: "renamed-source-title-book-001",
        mapped,
      }),
    ).toEqual({ kind: "existing", row: mapped });
  });

  it("claims only an exact legacy novel and fails closed on a partial match", () => {
    const legacy = {
      id: "novel-1",
      mongoBookId: null,
      slug: "legacy-title-book-001",
      title: "Legacy title",
      coverKey: null,
    };
    expect(
      planMongoImportedNovelIdentity({
        mongoBookId: "book-001",
        title: "Legacy title",
        legacySlug: legacy.slug,
        legacy,
      }),
    ).toEqual({ kind: "claim", row: legacy });
    expectErrorCode(
      () =>
        planMongoImportedNovelIdentity({
          mongoBookId: "book-001",
          title: "Different title",
          legacySlug: legacy.slug,
          legacy,
        }),
      "SYNC_IDENTITY_CONFLICT",
    );
  });

  it("keeps mapped chapter identity stable despite source reorder", () => {
    const mapped = {
      id: "chapter-row-1",
      mongoChapterId: "mongo-chapter-1",
      chapterNumber: 8,
      sortOrder: 8,
      slug: "chapter-8",
      title: "Chapter title",
      content: "Chapter content",
      publishedAt: null,
    };
    expect(
      planMongoImportedChapterIdentity({
        mongoChapterId: "mongo-chapter-1",
        sourceIndex: 1,
        title: "Updated title",
        content: "Updated content",
        mapped,
      }),
    ).toEqual({ kind: "existing", row: mapped });
  });

  it("claims only an exact positional legacy chapter and appends genuinely new IDs", () => {
    const legacy = {
      id: "chapter-row-1",
      mongoChapterId: null,
      chapterNumber: 2,
      sortOrder: 2,
      slug: "chapter-2",
      title: "Chapter 2",
      content: "Stable content",
      publishedAt: null,
    };
    expect(
      planMongoImportedChapterIdentity({
        mongoChapterId: "mongo-chapter-2",
        sourceIndex: 1,
        title: legacy.title,
        content: legacy.content,
        legacy,
      }),
    ).toEqual({ kind: "claim", row: legacy });
    expect(
      planMongoImportedChapterIdentity({
        mongoChapterId: "new-mongo-chapter",
        sourceIndex: 0,
        title: "New chapter",
        content: "New content",
      }),
    ).toEqual({ kind: "append" });
    expectErrorCode(
      () =>
        planMongoImportedChapterIdentity({
          mongoChapterId: "mongo-chapter-2",
          sourceIndex: 1,
          title: legacy.title,
          content: "Changed content",
          legacy,
        }),
      "SYNC_IDENTITY_CONFLICT",
    );
    expectErrorCode(
      () =>
        planMongoImportedChapterIdentity({
          mongoChapterId: "mongo-chapter-2",
          sourceIndex: 1,
          title: legacy.title,
          content: legacy.content,
          legacy: { ...legacy, mongoChapterId: "different-mongo-chapter" },
        }),
      "SYNC_IDENTITY_CONFLICT",
    );
  });

  it("rejects explicit incremental sync until initial backfill completes", () => {
    expect(() => assertTranslatedNovelIncrementalReady("auto", undefined)).not.toThrow();
    expect(() => assertTranslatedNovelIncrementalReady("incremental", "2026-08-14T00:00:00.000Z")).not.toThrow();
    expect(() => assertTranslatedNovelIncrementalReady("incremental", undefined)).toThrowError(
      TranslatedNovelImportStateError,
    );
    expectErrorCode(
      () => assertTranslatedNovelIncrementalReady("incremental", undefined),
      "SYNC_BACKFILL_REQUIRED",
    );
  });

  it("initializes a fresh cursor at source identity v1", () => {
    const state = {};
    expect(initializeMongoSourceIdentityCursor(state)).toEqual({ changed: true, migrationActive: false });
    expect(state).toEqual({ sourceIdentityVersion: 1 });
  });

  it("resets an old partial cursor into a bounded, crash-resumable identity migration", () => {
    const state = {
      afterBookId: "book-010",
      currentBookId: "book-011",
      chapterOffset: 20,
      backfillHighWaterBookId: "book-100",
      backfillStartedAt: "2026-08-01T00:00:00.000Z",
      backfillCompletedAt: "2026-08-01T00:00:00.000Z",
      incremental: {
        active: true,
        afterBookId: "book-050",
        currentBookId: "book-060",
        chapterOffset: 5,
      },
    };
    expect(initializeMongoSourceIdentityCursor(state)).toEqual({ changed: true, migrationActive: true });
    expect(state).toEqual({
      sourceIdentityVersion: 0,
      legacyIdentityThroughBookId: "book-060",
    });

    state.afterBookId = "book-005";
    state.backfillHighWaterBookId = "book-200";
    expect(initializeMongoSourceIdentityCursor(state)).toEqual({ changed: false, migrationActive: true });
    expect(state.afterBookId).toBe("book-005");
    expect(state.backfillHighWaterBookId).toBe("book-200");
  });

  it("does not treat an unprocessed high-water snapshot as proven legacy identity", () => {
    const state = {
      afterBookId: "book-010",
      currentBookId: "book-011",
      chapterOffset: 2,
      backfillHighWaterBookId: "book-100",
    };
    initializeMongoSourceIdentityCursor(state);
    expect(state).toEqual({
      sourceIdentityVersion: 0,
      legacyIdentityThroughBookId: "book-011",
    });
    expect(shouldRequireLegacyMongoNovelIdentity(state, "book-050")).toBe(false);
  });

  it("allows a future lower/random Mongo bookId after identity v1", () => {
    const state: ImportCursorState = {
      sourceIdentityVersion: 1 as const,
      backfillCompletedAt: "2026-08-01T00:00:00.000Z",
      backfillHighWaterBookId: "zzzz-existing-book",
    };
    const expectLegacy = shouldRequireLegacyMongoNovelIdentity(state, "000-new-random-book");
    expect(expectLegacy).toBe(false);
    expect(
      planMongoImportedNovelIdentity({
        mongoBookId: "000-new-random-book",
        title: "New book",
        legacySlug: "new-book-000-new-random-book",
        expectLegacy,
      }),
    ).toEqual({ kind: "create" });
  });

  it("requires legacy identity only through the migration boundary", () => {
    const state = {
      sourceIdentityVersion: 0 as const,
      legacyIdentityThroughBookId: "book-100",
    };
    expect(shouldRequireLegacyMongoNovelIdentity(state, "book-099")).toBe(true);
    expect(shouldRequireLegacyMongoNovelIdentity(state, "book-101")).toBe(false);
  });

  it("clears only a missing incremental current book and keeps the ordered checkpoint", () => {
    const incremental = {
      active: true,
      sweepUntil: "2026-08-14T12:00:00.000Z",
      afterUpdatedAt: "2026-08-14T09:00:00.000Z",
      afterBookId: "book-010",
      currentBookId: "book-011",
      currentBookUpdatedAt: "2026-08-14T10:00:00.000Z",
      chapterOffset: 25,
    };
    expect(clearMissingTranslatedNovelIncrementalCursor(incremental)).toEqual({
      active: true,
      sweepUntil: "2026-08-14T12:00:00.000Z",
      afterUpdatedAt: "2026-08-14T09:00:00.000Z",
      afterBookId: "book-010",
    });
  });

  it("freezes incremental ordering across partial chunks and advances with the frozen key", () => {
    const incremental = {
      active: true,
      currentBookId: "book-011",
      currentBookUpdatedAt: "2026-08-14T10:00:00.000Z",
      chapterOffset: 25,
    };
    const frozen = resolveTranslatedNovelIncrementalOrderingTimestamp({
      incremental,
      bookId: "book-011",
      sourceUpdatedAt: new Date("2026-08-14T11:30:00.000Z"),
      now: new Date("2026-08-14T12:00:00.000Z"),
    });
    expect(frozen).toBe("2026-08-14T10:00:00.000Z");
    expect(completeTranslatedNovelIncrementalBook(incremental, "book-011", frozen)).toEqual({
      active: true,
      afterUpdatedAt: "2026-08-14T10:00:00.000Z",
      afterBookId: "book-011",
    });
  });

  it("starts the first incremental sweep before a long backfill began", () => {
    const state: ImportCursorState = {
      sourceIdentityVersion: 1 as const,
      backfillStartedAt: "2026-08-01T00:00:00.000Z",
      backfillCompletedAt: "2026-08-03T00:00:00.000Z",
    };
    expect(
      getTranslatedNovelIncrementalLowerBound(state, new Date("2026-08-03T00:00:00.000Z")),
    ).toBe("2026-07-31T18:00:00.000Z");

    state.incremental = {
      active: false,
      lastSweepCompletedAt: "2026-08-04T12:00:00.000Z",
    };
    expect(
      getTranslatedNovelIncrementalLowerBound(state, new Date("2026-08-05T00:00:00.000Z")),
    ).toBe("2026-08-04T06:00:00.000Z");
  });

  it("accepts the original importer HTTP and HTTPS cover URL behavior", () => {
    expect(validateMongoCoverUrl("https://covers.example.com/path/cover.jpg?size=large").origin).toBe(
      "https://covers.example.com",
    );
    expect(validateMongoCoverUrl("http://legacy-covers.example.com/cover.jpg").origin).toBe(
      "http://legacy-covers.example.com",
    );
    expect(() => validateMongoCoverUrl("file:///private/cover.jpg")).toThrow();
    expect(() => validateMongoCoverUrl("not-a-url")).toThrow();
  });

  it("rejects oversized declared and streamed cover bodies before unbounded buffering", async () => {
    expect(validateMongoCoverContentLength("4", 4)).toBe(4);
    expect(() => validateMongoCoverContentLength("5", 4)).toThrow();
    expect(() => validateMongoCoverContentLength("unknown", 4)).toThrow();

    const bounded = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.from([1, 2]));
        controller.enqueue(Uint8Array.from([3, 4]));
        controller.close();
      },
    });
    await expect(readBoundedMongoCoverBody(bounded, 4)).resolves.toEqual(Uint8Array.from([1, 2, 3, 4]));

    let aborted = false;
    const oversized = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.from([1, 2, 3]));
        controller.enqueue(Uint8Array.from([4, 5, 6]));
      },
    });
    await expect(readBoundedMongoCoverBody(oversized, 4, () => { aborted = true; })).rejects.toThrow(
      "exceeds",
    );
    expect(aborted).toBe(true);
  });
});
