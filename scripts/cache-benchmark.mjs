import { performance } from "node:perf_hooks";

function numericArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function stringArg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function percentile(sorted, quantile) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1)];
}

async function benchmarkRoute(baseUrl, route, durationMs, concurrency, requestTimeoutMs) {
  const samples = [];
  let requests = 0;
  let errors = 0;
  let bytes = 0;
  const deadline = performance.now() + durationMs;

  // Warm the application/cache separately from the timed sample.
  await fetch(new URL(route, baseUrl), { redirect: "manual" }).catch(() => undefined);

  async function worker() {
    while (performance.now() < deadline) {
      const started = performance.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
      try {
        const response = await fetch(new URL(route, baseUrl), {
          redirect: "manual",
          signal: controller.signal,
          headers: { Accept: "text/html", "User-Agent": "NiyaiNow-cache-benchmark/1.0" },
        });
        const body = await response.arrayBuffer();
        bytes += body.byteLength;
        if (response.status >= 500) errors += 1;
      } catch {
        errors += 1;
      } finally {
        clearTimeout(timer);
        requests += 1;
        samples.push(performance.now() - started);
      }
    }
  }

  const started = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = performance.now() - started;
  samples.sort((a, b) => a - b);
  const totalLatency = samples.reduce((sum, value) => sum + value, 0);

  return {
    route,
    requests,
    errors,
    errorRate: requests ? errors / requests : 0,
    requestsPerSecond: requests / (elapsedMs / 1_000),
    averageMs: requests ? totalLatency / requests : 0,
    p95Ms: percentile(samples, 0.95),
    p99Ms: percentile(samples, 0.99),
    responseBytes: bytes,
  };
}

const baseUrl = new URL(stringArg("base-url", process.env.BENCHMARK_BASE_URL || "http://localhost:3000"));
const durationSeconds = numericArg("duration", 15);
const concurrency = numericArg("concurrency", 20);
const requestTimeoutMs = numericArg("timeout", 10_000);
const slug = stringArg("slug", process.env.BENCHMARK_NOVEL_SLUG || "");
const chapter = stringArg("chapter", process.env.BENCHMARK_CHAPTER_NUMBER || "1");
const routes = [
  "/",
  ...(slug
    ? [`/novel/${encodeURIComponent(slug)}`, `/novel/${encodeURIComponent(slug)}/chapters`, `/novel/${encodeURIComponent(slug)}/chapter/${encodeURIComponent(chapter)}`]
    : []),
];

if (!slug) {
  console.warn("BENCHMARK_NOVEL_SLUG/--slug is unset; only the homepage will be tested.");
}

const results = [];
for (const route of routes) {
  results.push(await benchmarkRoute(baseUrl, route, durationSeconds * 1_000, concurrency, requestTimeoutMs));
}

console.log(JSON.stringify({
  measuredAt: new Date().toISOString(),
  baseUrl: baseUrl.origin,
  durationSeconds,
  concurrency,
  results,
}, null, 2));
