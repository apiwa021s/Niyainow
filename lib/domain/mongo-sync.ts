export type MongoSyncSummary = {
  dryRun: boolean;
  mode: string;
  selectedBooks: number;
  completedBooks: number;
  partialBooks: number;
  importedChapters: number;
  paidChapters: number;
  skippedChapters: number;
  processedSourceChapters: number;
  coverCandidates: number;
  uploadedCovers: number;
  skippedCovers: number;
  stoppedForRuntime: boolean;
  backfillComplete: boolean;
  incrementalDue: boolean;
  nextAfterBookId: string | null;
  currentBookId: string | null;
  currentChapterOffset: number | null;
};

export type MongoSyncLoopStatus = {
  backfill: {
    completed: boolean;
    afterBookId: string | null;
    currentBookId: string | null;
    chapterOffset: number;
  };
  incremental: {
    active: boolean;
    afterUpdatedAt: string | null;
    afterBookId: string | null;
    currentBookId: string | null;
    chapterOffset: number;
    sweepUntil: string | null;
  };
};

/**
 * Accumulates work performed by consecutive bounded sync requests. Cursor and
 * lifecycle fields always describe the latest request rather than historical
 * state.
 */
export function mergeMongoSyncSummaries(
  current: MongoSyncSummary | null | undefined,
  next: MongoSyncSummary,
): MongoSyncSummary {
  if (!current) return { ...next };

  return {
    ...next,
    selectedBooks: current.selectedBooks + next.selectedBooks,
    completedBooks: current.completedBooks + next.completedBooks,
    partialBooks: current.partialBooks + next.partialBooks,
    importedChapters: current.importedChapters + next.importedChapters,
    paidChapters: current.paidChapters + next.paidChapters,
    skippedChapters: current.skippedChapters + next.skippedChapters,
    processedSourceChapters: current.processedSourceChapters + next.processedSourceChapters,
    coverCandidates: current.coverCandidates + next.coverCandidates,
    uploadedCovers: current.uploadedCovers + next.uploadedCovers,
    skippedCovers: current.skippedCovers + next.skippedCovers,
  };
}

/**
 * Auto sync drains the initial backfill first. Once that is complete, it only
 * continues a bounded incremental run while the server reports an active
 * sweep.
 */
export function shouldContinueMongoAutoSync(
  status: MongoSyncLoopStatus,
  result: MongoSyncSummary | null | undefined,
) {
  if (!status.backfill.completed) return true;
  return result?.mode === "incremental" && status.incremental.active;
}

/** A stable token for detecting a loop that has stopped advancing its cursor. */
export function mongoSyncCursorFingerprint(status: MongoSyncLoopStatus) {
  return JSON.stringify([
    status.backfill.completed,
    status.backfill.afterBookId,
    status.backfill.currentBookId,
    status.backfill.chapterOffset,
    status.incremental.active,
    status.incremental.afterUpdatedAt,
    status.incremental.afterBookId,
    status.incremental.currentBookId,
    status.incremental.chapterOffset,
    status.incremental.sweepUntil,
  ]);
}

export function isRetryableMongoSyncFailure(status: number | undefined, code?: string) {
  if (status === 409) return code === "SYNC_ALREADY_RUNNING";
  return status === 408 || status === 425 || status === 429 || (status !== undefined && status >= 500 && status <= 599);
}
