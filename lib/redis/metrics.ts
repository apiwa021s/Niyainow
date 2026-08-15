export type CacheMetric = "hit" | "miss" | "error" | "write" | "invalidate" | "bypass";
export type CacheCategory =
  | "novel"
  | "chapter"
  | "chapter-list"
  | "homepage"
  | "genre"
  | "ranking"
  | "taxonomy"
  | "banner"
  | "internal";

type MetricKey = `${CacheMetric}:${CacheCategory}`;

const counters = new Map<MetricKey, number>();

export function recordCacheMetric(metric: CacheMetric, category: CacheCategory) {
  const key: MetricKey = `${metric}:${category}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
}

export function getCacheMetricsSnapshot() {
  return Object.fromEntries(counters) as Partial<Record<MetricKey, number>>;
}

export function resetCacheMetrics() {
  counters.clear();
}
