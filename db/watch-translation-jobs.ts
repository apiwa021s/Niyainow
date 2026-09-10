import { loadEnvConfig } from "@next/env";

import { closeDbConnection } from "./index";
import { processTranslationJobs } from "../services/translation-worker";

loadEnvConfig(process.cwd());

let stopping = false;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

process.once("SIGINT", () => { stopping = true; });
process.once("SIGTERM", () => { stopping = true; });

async function main() {
  const configuredConcurrency = Number(process.env.TRANSLATION_WORKER_CONCURRENCY ?? 2);
  const concurrency = Number.isFinite(configuredConcurrency) ? Math.max(1, Math.min(Math.round(configuredConcurrency), 8)) : 1;
  console.info(JSON.stringify({ event: "translation_worker_started", mode: "continuous", concurrency }));
  while (!stopping) {
    try {
      const { processed } = await processTranslationJobs(concurrency, concurrency);
      if (processed === 0) await wait(3_000);
    } catch (error) {
      console.error("Translation worker cycle failed", error instanceof Error ? error.message : "Unknown error");
      await wait(5_000);
    }
  }
  await closeDbConnection();
  console.info(JSON.stringify({ event: "translation_worker_stopped" }));
}

void main().catch(async (error: unknown) => {
  console.error("Translation worker stopped unexpectedly", error instanceof Error ? error.message : "Unknown error");
  await closeDbConnection();
  process.exitCode = 1;
});
