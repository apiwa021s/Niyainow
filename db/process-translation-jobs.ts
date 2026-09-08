import { loadEnvConfig } from "@next/env";

import { closeDbConnection } from "./index";
import { processTranslationJobs } from "../services/translation-worker";

loadEnvConfig(process.cwd());

function readLimit() {
  const match = process.argv.find((value) => value.startsWith("--limit="));
  const value = Number(match?.slice("--limit=".length) ?? 10);
  return Number.isInteger(value) ? Math.max(1, Math.min(value, 100)) : 10;
}

async function main() {
  try {
    const result = await processTranslationJobs(readLimit());
    console.info(JSON.stringify({ event: "translation_worker_complete", ...result }));
  } finally {
    await closeDbConnection();
  }
}

main().catch((error: unknown) => {
  console.error("Translation worker failed", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
