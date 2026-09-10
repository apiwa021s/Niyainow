export {};

async function main() {
const baseUrl = new URL(process.env.SECURITY_TEST_BASE_URL ?? "http://localhost:3000");
const novelSlug = process.env.SECURITY_TEST_NOVEL_SLUG ?? process.argv[2];
const startChapter = Number(process.env.SECURITY_TEST_START_CHAPTER ?? 1);
const endChapter = Number(process.env.SECURITY_TEST_END_CHAPTER ?? 100);

const localHost = baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1" || baseUrl.hostname === "::1";
const stagingHost = /(?:^|[.-])(?:staging|preview)(?:[.-]|$)/iu.test(baseUrl.hostname);
if (!localHost && !stagingHost && process.env.SECURITY_TEST_ALLOW_PRODUCTION !== "true") {
  throw new Error("Refusing to target a production-like hostname. Set SECURITY_TEST_ALLOW_PRODUCTION=true only with explicit authorization.");
}
if (!novelSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(novelSlug)) {
  throw new Error("Provide SECURITY_TEST_NOVEL_SLUG or pass a valid novel slug as the first argument.");
}
if (!Number.isInteger(startChapter) || !Number.isInteger(endChapter) || startChapter < 0 || endChapter < startChapter || endChapter - startChapter > 100) {
  throw new Error("Chapter range must contain at most 101 non-negative integer chapters.");
}

const statusCounts = new Map<number, number>();
const latencies: number[] = [];
let cookie = "";

for (let chapter = startChapter; chapter <= endChapter; chapter += 1) {
  const startedAt = performance.now();
  const response = await fetch(new URL(`/novel/${novelSlug}/chapter/${chapter}`, baseUrl), {
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "th-TH,th;q=0.9",
      "sec-fetch-site": "same-origin",
      "user-agent": "NiyaiNow-Authorized-Security-Test/1.0",
      ...(cookie ? { cookie } : {}),
    },
    redirect: "manual",
  });
  latencies.push(performance.now() - startedAt);
  statusCounts.set(response.status, (statusCounts.get(response.status) ?? 0) + 1);
  const anonymousCookie = /(?:^|,\s*)nn_abuse_session=([^;,]+)/u.exec(response.headers.get("set-cookie") ?? "");
  if (anonymousCookie) cookie = `nn_abuse_session=${anonymousCookie[1]}`;
  await response.body?.cancel();
}

const averageLatencyMs = latencies.reduce((total, value) => total + value, 0) / Math.max(latencies.length, 1);
const sortedLatency = [...latencies].sort((a, b) => a - b);
const p95LatencyMs = sortedLatency[Math.min(sortedLatency.length - 1, Math.floor(sortedLatency.length * 0.95))] ?? 0;

console.info(JSON.stringify({
  target: baseUrl.origin,
  novelSlug,
  range: [startChapter, endChapter],
  requests: latencies.length,
  statuses: Object.fromEntries(statusCounts),
  rateLimited: statusCounts.get(429) ?? 0,
  averageLatencyMs: Math.round(averageLatencyMs),
  p95LatencyMs: Math.round(p95LatencyMs),
}, null, 2));
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
