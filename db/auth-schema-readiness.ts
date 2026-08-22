import "server-only";

import { sql } from "drizzle-orm";

import { getDb } from "./index";

const requiredAuthSchema = {
  users: [
    "id",
    "google_id",
    "email",
    "email_verified",
    "name",
    "image",
    "avatar_key",
    "role",
    "status",
    "age_gate_accepted_at",
    "reading_history_private",
    "library_private",
    "hide_story_title_in_notification",
    "last_login_at",
    "reader_prefs",
    "reader_prefs_updated_at",
    "created_at",
    "updated_at",
    "deleted_at",
  ],
  accounts: [
    "user_id",
    "type",
    "provider",
    "provider_account_id",
    "refresh_token",
    "access_token",
    "expires_at",
    "token_type",
    "scope",
    "id_token",
    "session_state",
  ],
  sessions: ["session_token", "user_id", "expires"],
} as const;

export class AuthSchemaOutOfDateError extends Error {
  readonly code = "AUTH_SCHEMA_OUT_OF_DATE";

  constructor(readonly missing: readonly string[]) {
    super(`Authentication database schema is out of date. Missing: ${missing.join(", ")}. Run npm run db:deploy against the deployment DATABASE_URL.`);
    this.name = "AuthSchemaOutOfDateError";
  }
}

export function findMissingAuthSchema(rows: readonly { tableName: string; columnName: string }[]) {
  const present = new Set(rows.map((row) => `${row.tableName}.${row.columnName}`));
  return Object.entries(requiredAuthSchema).flatMap(([table, columns]) =>
    columns.filter((column) => !present.has(`${table}.${column}`)).map((column) => `${table}.${column}`),
  );
}

let readinessPromise: Promise<void> | undefined;

async function inspectAuthSchema() {
  const rows = await getDb().execute<{ table_name: string; column_name: string }>(sql`
    select table_name, column_name
    from information_schema.columns
    where table_schema = current_schema()
      and table_name in ('users', 'accounts', 'sessions')
  `);
  const missing = findMissingAuthSchema(rows.map((row) => ({
    tableName: row.table_name,
    columnName: row.column_name,
  })));
  if (missing.length) throw new AuthSchemaOutOfDateError(missing);
}

export async function assertAuthSchemaReady() {
  const check = readinessPromise ?? inspectAuthSchema();
  readinessPromise = check;
  try {
    await check;
  } catch (error) {
    readinessPromise = undefined;
    throw error;
  }
}
