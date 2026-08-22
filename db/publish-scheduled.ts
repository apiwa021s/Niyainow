import { loadEnvConfig } from "@next/env";

import { closeDbConnection } from "./index";
import { publishDueChapters } from "../services/scheduled-publishing-service";

loadEnvConfig(process.cwd());

publishDueChapters()
  .then((chapters) => console.info("Scheduled publishing complete", { published: chapters.length }))
  .catch((error: unknown) => {
    console.error("Scheduled publishing failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);