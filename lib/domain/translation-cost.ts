export const DEFAULT_TRANSLATION_THB_PER_USD = 35;
export const TRANSLATION_TARGET_AVERAGE_THB = 1;

export function resolveTranslationCostPolicy(configuredRate?: string) {
  const parsed = configuredRate?.trim() ? Number(configuredRate) : Number.NaN;
  const configured = Number.isFinite(parsed) && parsed > 0;
  return {
    targetAverageThb: TRANSLATION_TARGET_AVERAGE_THB,
    thbPerUsd: configured ? parsed : DEFAULT_TRANSLATION_THB_PER_USD,
    rateSource: configured ? "CONFIGURED" as const : "PLANNING_DEFAULT" as const,
  };
}

export function translationCostMicrosToThb(costMicros: number, thbPerUsd: number) {
  return costMicros / 1_000_000 * thbPerUsd;
}

export function summarizeTranslationCosts(
  chapters: ReadonlyArray<{ costMicros: number; hasAiTranslation: boolean }>,
  policy: ReturnType<typeof resolveTranslationCostPolicy>,
) {
  // Count each chapter with a saved AI translation once. Manual-only chapters
  // do not dilute this average, even if an AI attempt spent money and failed.
  // Keep failures, retries and polishing in the numerator; failed attempts
  // do not count as additional produced chapters.
  const totalCostMicros = chapters.reduce((sum, chapter) => sum + chapter.costMicros, 0);
  const producedChapterCount = chapters.filter((chapter) => chapter.hasAiTranslation).length;
  const averageCostMicros = producedChapterCount > 0 ? totalCostMicros / producedChapterCount : null;
  const totalCostThb = translationCostMicrosToThb(totalCostMicros, policy.thbPerUsd);
  const averageCostThb = averageCostMicros === null ? null : translationCostMicrosToThb(averageCostMicros, policy.thbPerUsd);
  return {
    totalCostMicros,
    producedChapterCount,
    averageCostMicros,
    totalCostThb,
    averageCostThb,
    targetGapThb: averageCostThb === null ? null : averageCostThb - policy.targetAverageThb,
  };
}
