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
  console.info(JSON.stringify({ event: "translation_worker_started", mode: "continuous" }));
  while (!stopping) {
    try {
      const { processed } = await processTranslationJobs(1);
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
