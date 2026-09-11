import { describe, expect, it } from "vitest";

import {
  EnvironmentConfigurationError,
  getRedisRuntimeEnv,
  getRuntimeEnv,
  requireDatabaseEnv,
  requireCronEnv,
  requireNovelImportEnv,
} from "./env";

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

  it("requires a strong secret before enabling the private novel import API", () => {
    expect(() => requireNovelImportEnv({ NODE_ENV: "test" })).toThrow(EnvironmentConfigurationError);
    expect(() => requireNovelImportEnv({
      NODE_ENV: "test",
      NOVEL_IMPORT_TOKEN: "too-short",
    })).toThrow(EnvironmentConfigurationError);
    expect(requireNovelImportEnv({
      NODE_ENV: "test",
      NOVEL_IMPORT_TOKEN: "test-import-token-with-at-least-32-characters",
    }).NOVEL_IMPORT_TOKEN).toHaveLength(45);
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

  it("parses REDIS_URL as the only Redis connection setting", () => {
    const redis = getRedisRuntimeEnv({
      NODE_ENV: "test",
      CACHE_ENABLED: "true",
      REDIS_URL: "rediss://default:secret@cache.example.test:6379/0",
      REDIS_TIMEOUT_MS: "75",
    });
    expect(redis).toMatchObject({
      CACHE_ENABLED: true,
      REDIS_URL: "rediss://default:secret@cache.example.test:6379/0",
      REDIS_TIMEOUT_MS: 75,
    });
  });

  it("requires a strong secret for scheduled publishing", () => {
    expect(() => requireCronEnv({ NODE_ENV: "test" })).toThrow(EnvironmentConfigurationError);
    expect(() => requireCronEnv({ NODE_ENV: "test", CRON_SECRET: "too-short" })).toThrow(EnvironmentConfigurationError);
    expect(requireCronEnv({
      NODE_ENV: "test",
      CRON_SECRET: "test-cron-secret-with-at-least-32-characters",
    }).CRON_SECRET).toHaveLength(44);
  });

  it("rejects a non-Redis REDIS_URL", () => {
    expect(() => getRedisRuntimeEnv({
      NODE_ENV: "test",
      REDIS_URL: "https://cache.example.test",
    })).toThrow(EnvironmentConfigurationError);
  });
});
