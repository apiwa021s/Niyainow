import { z } from "zod";

const emptyToUndefined = (value: unknown) => (value === "" ? undefined : value);

const httpUrl = z.url().refine((value) => value.startsWith("https://") || value.startsWith("http://"), {
  message: "must use the http:// or https:// protocol",
});
const optionalUrl = z.preprocess(emptyToUndefined, httpUrl.optional());
const optionalString = z.preprocess(emptyToUndefined, z.string().trim().min(1).optional());

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
  MONGO_COVER_ALLOWED_ORIGINS: optionalString,
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
  AUTH_SECRET: z.preprocess(emptyToUndefined, z.string().min(32).optional()),
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  AUTH_TRUST_HOST: z.preprocess(emptyToUndefined, z.enum(["true", "false"]).optional()),
  R2_ACCOUNT_ID: z.preprocess(emptyToUndefined, z.string().regex(/^[a-zA-Z0-9_-]+$/).optional()),
  R2_ACCESS_KEY_ID: optionalString,
  R2_SECRET_ACCESS_KEY: optionalString,
  R2_BUCKET_NAME: z.preprocess(
    emptyToUndefined,
    z.string().regex(/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/).optional(),
  ),
  R2_PUBLIC_URL: optionalUrl,
  R2_UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error", "silent"]).default("info"),
});

export type RuntimeEnv = z.infer<typeof runtimeEnvSchema>;
export type RequiredDatabaseEnv = Pick<RuntimeEnv, "DATABASE_URL" | "DATABASE_MAX_CONNECTIONS"> & {
  DATABASE_URL: string;
};
export type RequiredMongoEnv = Pick<RuntimeEnv, "MONGODB_URL" | "MONGO_COVER_ALLOWED_ORIGINS"> & {
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
