import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const httpUrl = z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
  message: "must use the http:// or https:// protocol",
});
const optionalUrl = z.preprocess(emptyToUndefined, httpUrl.optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());
const optionalRedisUrl = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .url()
    .refine((value) => value.startsWith("redis://") || value.startsWith("rediss://"), {
      message: "must use the redis:// or rediss:// protocol",
    })
    .optional(),
);
const booleanEnv = (fallback: boolean) =>
  z.preprocess(
    (value) => {
      if (value === undefined || value === "") return fallback;
      if (typeof value === "boolean") return value;
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") return true;
        if (value.toLowerCase() === "false") return false;
      }
      return value;
    },
    z.boolean(),
  );

const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PHASE: optionalString,
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_ASSET_URL: optionalUrl,
  MONGODB_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url()
      .refine((value) => value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"), {
        message: "must use the mongodb:// or mongodb+srv:// protocol",
      })
      .optional(),
  ),
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .url()
      .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
        message: "must use the postgres:// or postgresql:// protocol",
      })
      .optional(),
  ),
  DATABASE_MAX_CONNECTIONS: z.coerce.number().int().min(1).max(20).default(5),
  CACHE_ENABLED: booleanEnv(true),
  REDIS_ENABLED: booleanEnv(false),
  REDIS_URL: optionalRedisUrl,
  REDIS_HOST: optionalString,
  REDIS_PORT: z.coerce.number().int().min(1).max(65_535).default(6379),
  REDIS_USERNAME: optionalString,
  REDIS_PASSWORD: optionalString,
  REDIS_DATABASE: z.coerce.number().int().min(0).max(15).default(0),
  REDIS_SSL: booleanEnv(false),
  REDIS_TIMEOUT_MS: z.coerce.number().int().min(25).max(10_000).default(75),
  REDIS_DEBUG: booleanEnv(false),
  REDIS_CACHE_PREFIX: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(64).default("niyainow")),
  REDIS_MAX_ITEM_BYTES: z.coerce.number().int().min(16_384).max(10_485_760).default(1_048_576),
  AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  AUTH_TRUST_HOST: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  TURNSTILE_SECRET_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  R2_ACCOUNT_ID: z.preprocess(emptyToUndefined, z.string().regex(/^[a-zA-Z0-9_-]+$/).optional()),
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET_NAME: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/).optional(),
  ),
  R2_PUBLIC_URL: optionalUrl,
  R2_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  STRIPE_SECRET_KEY: z.preprocess(emptyToUndefined, z.string().trim().startsWith("sk_").optional()),
  STRIPE_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().trim().startsWith("whsec_").optional()),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
  }).superRefine((env, context) => {
    if (Boolean(env.TURNSTILE_SECRET_KEY) !== Boolean(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
      context.addIssue({
        code: "custom",
        path: ["TURNSTILE_SECRET_KEY"],
        message: "TURNSTILE_SECRET_KEY and NEXT_PUBLIC_TURNSTILE_SITE_KEY must be configured together",
      });
    }
  });

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;
export type RequiredDatabaseEnv = Pick<RuntimeEnv, "DATABASE_URL" | "DATABASE_MAX_CONNECTIONS"> & {
  DATABASE_URL: string;
};
export type RedisRuntimeEnv = Pick<
  RuntimeEnv,
  | "CACHE_ENABLED"
  | "REDIS_ENABLED"
  | "REDIS_URL"
  | "REDIS_HOST"
  | "REDIS_PORT"
  | "REDIS_USERNAME"
  | "REDIS_PASSWORD"
  | "REDIS_DATABASE"
  | "REDIS_SSL"
  | "REDIS_TIMEOUT_MS"
  | "REDIS_DEBUG"
  | "REDIS_CACHE_PREFIX"
  | "REDIS_MAX_ITEM_BYTES"
>;
export type RequiredMongoEnv = Pick<RuntimeEnv, "MONGODB_URL"> & {
  MONGODB_URL: string;
};
export type RequiredAuthEnv = Required<
  Pick<RuntimeEnv, "AUTH_SECRET" | "AUTH_GOOGLE_ID" | "AUTH_GOOGLE_SECRET">
>;
export type RequiredR2Env = Required<
  Pick<
    RuntimeEnv,
    | "R2_ACCOUNT_ID"
    | "R2_ACCESS_KEY_ID"
    | "R2_SECRET_ACCESS_KEY"
    | "R2_BUCKET_NAME"
    | "R2_UPLOAD_URL_TTL_SECONDS"
  >
>;
export type RequiredStripeEnv = Required<Pick<RuntimeEnv, "NEXT_PUBLIC_APP_URL" | "STRIPE_SECRET_KEY" | "STRIPE_WEBHOOK_SECRET">>;

export class EnvironmentConfigurationError extends Error {
  readonly missing: readonly string[];

  constructor(message: string, missing: readonly string[] = []) {
    super(message);
    this.name = "EnvironmentConfigurationError";
    this.missing = missing;
  }
}

/**
 * Parses configured values but deliberately treats server credentials as optional.
 * This makes module evaluation safe during `next build`; use a `require*Env` helper
 * at the actual database/auth/storage operation boundary.
 */
export function getRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv {
  const result = runtimeEnvSchema.safeParse(source);

  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new EnvironmentConfigurationError(`Invalid environment configuration: ${issues}`);
  }

  return result.data;
}

function requireKeys<const TKey extends keyof RuntimeEnv>(
  env: RuntimeEnv,
  keys: readonly TKey[],
  area: string,
): asserts env is RuntimeEnv & Required<Pick<RuntimeEnv, TKey>> {
  const missing = keys.filter((key) => env[key] === undefined || env[key] === "").map(String);

  if (missing.length > 0) {
    throw new EnvironmentConfigurationError(
      `${area} is not configured. Missing environment variables: ${missing.join(", ")}`,
      missing,
    );
  }
}

export function requireDatabaseEnv(source: NodeJS.ProcessEnv = process.env): RequiredDatabaseEnv {
  const env = getRuntimeEnv(source);
  requireKeys(env, ["DATABASE_URL"], "Database access");
  return env;
}

/** Redis is an optional acceleration layer. Missing configuration disables it. */
export function getRedisRuntimeEnv(source: NodeJS.ProcessEnv = process.env): RedisRuntimeEnv {
  const env = getRuntimeEnv(source);
  return {
    CACHE_ENABLED: env.CACHE_ENABLED,
    REDIS_ENABLED: env.REDIS_ENABLED,
    REDIS_URL: env.REDIS_URL,
    REDIS_HOST: env.REDIS_HOST,
    REDIS_PORT: env.REDIS_PORT,
    REDIS_USERNAME: env.REDIS_USERNAME,
    REDIS_PASSWORD: env.REDIS_PASSWORD,
    REDIS_DATABASE: env.REDIS_DATABASE,
    REDIS_SSL: env.REDIS_SSL,
    REDIS_TIMEOUT_MS: env.REDIS_TIMEOUT_MS,
    REDIS_DEBUG: env.REDIS_DEBUG,
    REDIS_CACHE_PREFIX: env.REDIS_CACHE_PREFIX,
    REDIS_MAX_ITEM_BYTES: env.REDIS_MAX_ITEM_BYTES,
  };
}

export function requireMongoEnv(source: NodeJS.ProcessEnv = process.env): RequiredMongoEnv {
  const legacySource = source as NodeJS.ProcessEnv & { mongourl?: string };
  const env = getRuntimeEnv({ ...source, MONGODB_URL: source.MONGODB_URL || legacySource.mongourl });
  requireKeys(env, ["MONGODB_URL"], "MongoDB import source");
  return env;
}

export function requireAuthEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv & RequiredAuthEnv {
  const env = getRuntimeEnv(source);
  requireKeys(env, ["AUTH_SECRET", "AUTH_GOOGLE_ID", "AUTH_GOOGLE_SECRET"], "Google authentication");
  return env;
}

export function requireR2Env(source: NodeJS.ProcessEnv = process.env): RuntimeEnv & RequiredR2Env {
  const env = getRuntimeEnv(source);
  requireKeys(
    env,
    ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"],
    "Cloudflare R2",
  );
  return env;
}

export function hasStripeConfiguration(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnv(source);
  return Boolean(env.NEXT_PUBLIC_APP_URL && env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET);
}

export function requireStripeEnv(source: NodeJS.ProcessEnv = process.env): RuntimeEnv & RequiredStripeEnv {
  const env = getRuntimeEnv(source);
  requireKeys(env, ["NEXT_PUBLIC_APP_URL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"], "Stripe payments");
  return env;
}

export function isProductionBuild(source: NodeJS.ProcessEnv = process.env) {
  return source.NEXT_PHASE === "phase-production-build";
}

export function hasDatabaseConfiguration(source: NodeJS.ProcessEnv = process.env) {
  return Boolean(getRuntimeEnv(source).DATABASE_URL);
}

export function getAssetBaseUrl(source: NodeJS.ProcessEnv = process.env) {
  const env = getRuntimeEnv(source);
  return env.NEXT_PUBLIC_ASSET_URL ?? env.R2_PUBLIC_URL;
}
