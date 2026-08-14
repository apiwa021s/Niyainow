import { describe, expect, it } from "vitest";

import { EnvironmentConfigurationError, getRuntimeEnv, requireDatabaseEnv } from "./env";

describe("environment helpers", () => {
  it("permits credential-less module evaluation", () => {
    const env = getRuntimeEnv({ NODE_ENV: "production", NEXT_PHASE: "phase-production-build" });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.R2_ACCESS_KEY_ID).toBeUndefined();
  });

  it("fails only when a database operation requires missing configuration", () => {
    expect(() => requireDatabaseEnv({ NODE_ENV: "test" })).toThrow(EnvironmentConfigurationError);
  });

  it("accepts a valid pooled PostgreSQL URL", () => {
    expect(
      requireDatabaseEnv({ NODE_ENV: "test", DATABASE_URL: "postgresql://user:pass@db.example.test/app" })
        .DATABASE_URL,
    ).toContain("postgresql://");
  });
});
