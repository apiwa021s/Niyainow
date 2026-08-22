import { describe, expect, it } from "vitest";

import { EnvironmentConfigurationError, getRedisRuntimeEnv, getRuntimeEnv, requireDatabaseEnv } from "./env";

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

  it("requires Turnstile client and server keys together", () => {
    expect(() => getRuntimeEnv({
      NODE_ENV: "test",
      TURNSTILE_SECRET_KEY: "turnstile-secret",
    })).toThrow(EnvironmentConfigurationError);
    expect(getRuntimeEnv({
      NODE_ENV: "test",
      TURNSTILE_SECRET_KEY: "turnstile-secret",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
    })).toMatchObject({
      TURNSTILE_SECRET_KEY: "turnstile-secret",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
    });
  });

  it("parses the discrete Redis feature flags without requiring credentials", () => {
    const redis = getRedisRuntimeEnv({
      NODE_ENV: "test",
      CACHE_ENABLED: "true",
      REDIS_ENABLED: "true",
      REDIS_HOST: "cache.example.test",
      REDIS_SSL: "true",
      REDIS_TIMEOUT_MS: "75",
    });
    expect(redis).toMatchObject({
      CACHE_ENABLED: true,
      REDIS_ENABLED: true,
      REDIS_HOST: "cache.example.test",
      REDIS_SSL: true,
      REDIS_TIMEOUT_MS: 75,
    });
  });
});
