import { getRuntimeEnv } from "@/lib/env";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogContext = Record<string, unknown>;

const LEVEL_WEIGHT: Record<LogLevel | "silent", number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: Number.POSITIVE_INFINITY,
};

const REDACTED = "[REDACTED]";
const REDACTED_KEY = /(?:authorization|cookie|password|passwd|secret|token|api[-_]?key|access[-_]?key|private[-_]?key|database[-_]?url|connection[-_]?string|session)/i;
const MAX_DEPTH = 6;
const MAX_STRING_LENGTH = 4_000;

function sanitizeString(value: string) {
  return value
    .replace(/\b(?:postgres|postgresql):\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .replace(/\bAKIA[A-Z0-9]{16}\b/g, REDACTED);
}

function sanitize(value: unknown, key = "", depth = 0, seen = new WeakSet<object>()): unknown {
  if (REDACTED_KEY.test(key)) return REDACTED;
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "string") {
    const truncated = value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}…[truncated]` : value;
    return sanitizeString(truncated);
  }
  if (typeof value === "function" || typeof value === "symbol") return String(value);
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitize(value.message, "message", depth + 1, seen),
      ...(process.env.NODE_ENV === "production" ? {} : { stack: value.stack ? sanitizeString(value.stack) : undefined }),
    };
  }
  if (depth >= MAX_DEPTH) return "[MAX_DEPTH]";
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";

  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitize(item, key, depth + 1, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 100)
      .map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey, depth + 1, seen)]),
  );
}

function write(level: LogLevel, message: string, context: LogContext) {
  let configuredLevel: LogLevel | "silent" = "info";
  try {
    configuredLevel = getRuntimeEnv().LOG_LEVEL;
  } catch {
    // Logging must remain available when reporting malformed environment config.
  }

  if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[configuredLevel]) return;

  const safeContext = sanitize(context);
  const entry = JSON.stringify({
    ...(safeContext && typeof safeContext === "object" && !Array.isArray(safeContext)
      ? (safeContext as LogContext)
      : {}),
    timestamp: new Date().toISOString(),
    level,
    message: sanitizeString(message),
  });

  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else if (level === "debug") console.debug(entry);
  else console.info(entry);
}

export type Logger = {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(context: LogContext): Logger;
};

export function createLogger(baseContext: LogContext = {}): Logger {
  const log = (level: LogLevel, message: string, context: LogContext = {}) =>
    write(level, message, { ...baseContext, ...context });

  return {
    debug: (message, context) => log("debug", message, context),
    info: (message, context) => log("info", message, context),
    warn: (message, context) => log("warn", message, context),
    error: (message, context) => log("error", message, context),
    child: (context) => createLogger({ ...baseContext, ...context }),
  };
}

export const logger = createLogger({ service: "niyainow-web" });
