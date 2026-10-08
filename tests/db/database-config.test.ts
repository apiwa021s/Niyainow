import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  timeout: undefined as string | undefined,
  postgres: vi.fn(() => ({ end: vi.fn() })),
  drizzle: vi.fn(() => ({ database: true })),
}));

vi.mock("postgres", () => ({ default: fixture.postgres }));
vi.mock("drizzle-orm/postgres-js", () => ({ drizzle: fixture.drizzle }));
vi.mock("@/lib/env", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env")>();
  return {
    ...actual,
    requireDatabaseEnv: () => actual.requireDatabaseEnv({
      NODE_ENV: "test",
      DATABASE_URL: "postgresql://user:pass@db.example.test/app",
      DATABASE_CONNECT_TIMEOUT_SECONDS: fixture.timeout,
    }),
  };
});

import { getDb } from "@/db";

function clearDatabaseGlobals() {
  globalThis.__niyainowPostgresClient = undefined;
  globalThis.__niyainowDatabase = undefined;
}

describe("database connection configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearDatabaseGlobals();
    fixture.timeout = undefined;
  });
  afterEach(clearDatabaseGlobals);

  it.each([
    { configured: undefined, expected: 30 },
    { configured: "15", expected: 15 },
  ])("forwards the validated timeout $expected without creating extra clients", ({ configured, expected }) => {
    fixture.timeout = configured;

    const first = getDb();
    expect(getDb()).toBe(first);
    expect(fixture.postgres).toHaveBeenCalledTimes(1);
    expect(fixture.postgres).toHaveBeenCalledWith("postgresql://user:pass@db.example.test/app", {
      max: 5,
      idle_timeout: 20,
      connect_timeout: expected,
      prepare: false,
    });
  });
});
