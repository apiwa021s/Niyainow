import { loadEnvConfig } from "@next/env";
import { sql } from "drizzle-orm";

import { closeDbConnection, getDb } from "./index";

loadEnvConfig(process.cwd());

const REQUIRED_TABLES = [
  "novel_class_affinities",
  "reader_accounts",
  "reader_activity_events",
  "reader_chapter_qualifications",
  "reader_class_exp_entries",
  "reader_class_profiles",
  "reader_class_progress",
  "reader_cosmetic_items",
  "reader_cosmetic_loadouts",
  "reader_cosmetic_unlocks",
  "reader_daily_progress",
  "reader_mission_claims",
  "reader_mission_definitions",
  "reader_mission_progress",
  "reader_reading_sessions",
] as const;

async function checkReaderRpgSchema() {
  const rows = await getDb().execute<{ tableName: string }>(sql`
    select table_name as "tableName"
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  const found = new Set(rows.map((row) => row.tableName));
  const missing = REQUIRED_TABLES.filter((table) => !found.has(table));
  if (missing.length > 0) throw new Error(`Missing Reader RPG tables: ${missing.join(", ")}`);

  const [columns] = await getDb().execute<{
    hasSubClasses: boolean;
    hasMilliExp: boolean;
    hasReaderExp: boolean;
  }>(sql`
    select
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reader_class_profiles' and column_name = 'sub_class_ids') as "hasSubClasses",
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reader_class_progress' and column_name = 'total_exp_milli') as "hasMilliExp",
      exists(select 1 from information_schema.columns where table_schema = 'public' and table_name = 'reader_activity_events' and column_name = 'reader_exp_delta') as "hasReaderExp"
  `);
  if (!columns?.hasSubClasses || !columns.hasMilliExp || !columns.hasReaderExp) {
    throw new Error("Reader RPG migration is missing one or more required columns");
  }

  const [catalog] = await getDb().execute<{
    missionCount: number;
    cosmeticCount: number;
  }>(sql`
    select
      (select count(*)::int from reader_mission_definitions where is_active = true) as "missionCount",
      (select count(*)::int from reader_cosmetic_items where is_active = true) as "cosmeticCount"
  `);
  if ((catalog?.missionCount ?? 0) < 8 || (catalog?.cosmeticCount ?? 0) < 13) {
    throw new Error("Reader RPG mission or cosmetic catalog seed is incomplete");
  }

  console.info(
    `Reader RPG schema ready (${REQUIRED_TABLES.length}/${REQUIRED_TABLES.length} tables, ${catalog.missionCount} missions, ${catalog.cosmeticCount} cosmetics)`,
  );
}

checkReaderRpgSchema()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
