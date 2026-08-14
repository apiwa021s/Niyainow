import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireDatabaseEnv } from "@/lib/env";

import * as schema from "./schema";

type PostgresClient = ReturnType<typeof postgres>;

function createDatabase(client: PostgresClient) {
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDatabase>;

declare global {
  var __niyainowPostgresClient: PostgresClient | undefined;
  var __niyainowDatabase: Database | undefined;
}

/** Lazily creates a serverless-friendly postgres.js client on first real query. */
export function getDb(): Database {
  if (globalThis.__niyainowDatabase) return globalThis.__niyainowDatabase;

  const env = requireDatabaseEnv();
  const client =
    globalThis.__niyainowPostgresClient ??
    postgres(env.DATABASE_URL, {
      max: env.DATABASE_MAX_CONNECTIONS,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  const database = createDatabase(client);

  globalThis.__niyainowPostgresClient = client;
  globalThis.__niyainowDatabase = database;
  return database;
}

/** Intended for one-shot scripts/tests, not for request handlers. */
export async function closeDbConnection() {
  const client = globalThis.__niyainowPostgresClient;
  if (!client) return;

  await client.end({ timeout: 5 });
  globalThis.__niyainowPostgresClient = undefined;
  globalThis.__niyainowDatabase = undefined;
}

export { schema };
export * from "./schema";
