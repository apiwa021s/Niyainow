import "server-only";

import { logger } from "@/lib/logger";

const readLogger = logger.child({ component: "database-read" });
const RETRY_DELAY_MS = 250;
const TRANSIENT_CONNECTION_CODES = new Set([
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "EPIPE",
  "EAI_AGAIN",
]);

function transientConnectionCode(error: unknown): string | null {
  const seen = new Set<object>();
  let current = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const { code, cause } = current as { code?: unknown; cause?: unknown };
    if (typeof code === "string") {
      return TRANSIENT_CONNECTION_CODES.has(code) ? code : null;
    }
    current = cause;
  }
  return null;
}

/** Only use for side-effect-free reads, never writes or entire transactions. */
export async function retryDatabaseRead<T>(read: () => Promise<T>, operation: string): Promise<T> {
  try {
    return await read();
  } catch (error) {
    const errorCode = transientConnectionCode(error);
    if (!errorCode) throw error;
    // Do not log the query, its parameters or connection credentials.
    readLogger.warn("Retrying database read after a transient connection failure", {
      operation,
      errorCode,
      retryDelayMs: RETRY_DELAY_MS,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
    // A second failure must propagate: cached loaders must not store a fallback
    // as a successful refresh and overwrite their previous good response.
    return read();
  }
}
