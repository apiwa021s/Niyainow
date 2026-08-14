export type RankingSignals = {
  views: number;
  uniqueReaders: number;
  chapterReads: number;
  libraryAdds: number;
  ratings: number;
};

/**
 * Isolated first-release ranking formula. Inputs come from daily aggregates so
 * public ranking requests never scan raw user activity.
 */
export function calculateRankingScore(signals: RankingSignals) {
  return (
    Math.log1p(Math.max(0, signals.views)) * 1.5 +
    Math.log1p(Math.max(0, signals.uniqueReaders)) * 3 +
    Math.log1p(Math.max(0, signals.chapterReads)) * 2 +
    Math.log1p(Math.max(0, signals.libraryAdds)) * 6 +
    Math.log1p(Math.max(0, signals.ratings)) * 4
  );
}
