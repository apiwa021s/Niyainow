import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Generation is schema-only; the local fallback avoids requiring credentials.
    // `drizzle-kit migrate/push/studio` must be run with the real DATABASE_URL.
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/niyainow",
  },
  migrations: {
    prefix: "timestamp",
  },
  strict: true,
  verbose: true,
});
