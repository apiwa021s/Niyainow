import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { users } from "@/db/schema";

export type StoredReaderPrefs = {
  prefs: Record<string, unknown>;
  updatedAt: string;
} | null;

/**
 * Reading display preferences are account-wide, not per-novel: a reader picks
 * a comfortable size and theme once and expects every story to look the same.
 *
 * The payload is stored opaquely. Shape validation happens at the route with
 * the same zod schema the client normalises against, and the client re-runs
 * normalizeReaderPrefs on read, so a stale blob written by an older build can
 * never render an invalid reader.
 */
export async function getReaderPrefs(userId: string): Promise<StoredReaderPrefs> {
  const db = getDb();
  const [row] = await db
    .select({ prefs: users.readerPrefs, updatedAt: users.readerPrefsUpdatedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.prefs || !row.updatedAt) return null;
  return { prefs: row.prefs, updatedAt: row.updatedAt.toISOString() };
}

export async function saveReaderPrefs(userId: string, prefs: Record<string, unknown>) {
  const db = getDb();
  const updatedAt = new Date();
  await db
    .update(users)
    .set({ readerPrefs: prefs, readerPrefsUpdatedAt: updatedAt })
    .where(eq(users.id, userId));

  return { prefs, updatedAt: updatedAt.toISOString() };
}
