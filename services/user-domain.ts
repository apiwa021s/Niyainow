export type ProgressSnapshot = {
  chapterId: string;
  progressPercent: number;
  position: number;
  completed: boolean;
  updatedAt: Date;
};

export type ProgressUpdate = Omit<ProgressSnapshot, "updatedAt">;

export function membershipCountDelta(wasPresent: boolean, isPresent: boolean) {
  return Number(isPresent) - Number(wasPresent);
}

export function ratingAggregateDelta(previousScore: number | null, nextScore: number | null) {
  return {
    count: membershipCountDelta(previousScore !== null, nextScore !== null),
    sum: (nextScore ?? 0) - (previousScore ?? 0),
  };
}

export function publishedReviewCountDelta(
  previous: { status: string; deletedAt: Date | null } | null,
  next: { status: string; deletedAt: Date | null } | null,
) {
  const wasPublic = previous?.status === "PUBLISHED" && previous.deletedAt === null;
  const isPublic = next?.status === "PUBLISHED" && next.deletedAt === null;
  return membershipCountDelta(wasPublic, isPublic);
}

/**
 * Keeps scroll telemetry from turning into a write per event. Chapter changes,
 * completion, or a meaningful movement are persisted immediately; otherwise a
 * heartbeat is accepted after the minimum interval.
 */
export function shouldPersistProgress(
  current: ProgressSnapshot | null,
  next: ProgressUpdate,
  now: Date,
  minimumIntervalMs = 8_000,
) {
  if (!current) return true;
  if (current.updatedAt.getTime() > now.getTime()) return false;
  if (current.chapterId !== next.chapterId) return true;
  if (current.completed !== next.completed) return true;

  const percentDelta = Math.abs(current.progressPercent - next.progressPercent);
  const positionDelta = Math.abs(current.position - next.position);
  if (percentDelta >= 2 || positionDelta >= 500) return true;

  return now.getTime() - current.updatedAt.getTime() >= minimumIntervalMs;
}
