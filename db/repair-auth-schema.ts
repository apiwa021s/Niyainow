import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

import { assertAuthSchemaReady } from "./auth-schema-readiness";
import { closeDbConnection, getDb } from "./index";

loadEnvConfig(process.cwd());

async function repairAuthSchema() {
  await getDb().execute(sql`
    alter table public.users
      add column if not exists age_gate_accepted_at timestamp with time zone,
      add column if not exists reading_history_private boolean default true not null,
      add column if not exists library_private boolean default true not null,
      add column if not exists hide_story_title_in_notification boolean default true not null
  `);
  await assertAuthSchemaReady();
  console.info("Authentication database schema repaired and verified");
}

repairAuthSchema()
  .catch((error: unknown) => {
    console.error("Authentication database schema repair failed", error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);