import { readFile } from "node:fs/promises";
import path from "node:path";

import { loadEnvConfig } from "@next/env";

import { closeDbConnection } from "./index";
import { translationMasterFileDefinitions } from "../lib/domain/translation-master";
import { importTranslationMasterFiles } from "../services/translation-master-service";

loadEnvConfig(process.cwd());

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const directory = argument("--dir");
  if (!directory) throw new Error("Usage: npm run db:import-translation-masters -- --dir <csv-directory> [--approve]");
  const files = await Promise.all(Object.keys(translationMasterFileDefinitions).map(async (name) => ({
    name,
    text: await readFile(path.join(path.resolve(directory), name), "utf8"),
  })));
  const result = await importTranslationMasterFiles({ files, approve: process.argv.includes("--approve") });
  console.info(`Translation masters imported: ${result.total} records (${result.approved ? "approved and active" : "draft/review status preserved"})`);
  console.info(result.counts);
}

main()
  .catch((error: unknown) => {
    console.error("Translation master import failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
