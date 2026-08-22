import { loadEnvConfig } from "@next/env";
import { migrate } from "drizzle-orm/postgres-js/migrator";

import { closeDbConnection, getDb } from "./index";

loadEnvConfig(process.cwd());

async function runMigrations() {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.info("Database migrations complete");
}

runMigrations()
  .catch((error: unknown) => {
    console.error("Database migration failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);