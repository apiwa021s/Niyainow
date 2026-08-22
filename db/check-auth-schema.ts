import { loadEnvConfig } from "@next/env";

import { assertAuthSchemaReady } from "./auth-schema-readiness";
import { closeDbConnection } from "./index";

loadEnvConfig(process.cwd());

assertAuthSchemaReady()
  .then(() => console.info("Authentication database schema is ready"))
  .catch((error: unknown) => {
    console.error("Authentication database schema check failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
