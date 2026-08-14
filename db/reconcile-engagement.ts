import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { and, asc, eq, gt, isNull, sql } from "drizzle-orm";

import { closeDbConnection, getDb } from "@/db";
import {
  novelFollows,
  novelStatistics,
  novels,
  ratings,
  reviews,
  siteSettings,
  userLibrary,
} from "@/db/schema";
import { logger } from "@/lib/logger";

const RECONCILIATION_CURSOR_KEY = "jobs.engagement_reconcile.cursor";
const DEFAULT_BATCH_SIZE = 200;

function batchSizeArgument() {
  const raw = process.argv.find((argument) => argument.startsWith("--limit="))?.slice("--limit=".length);
  if (raw === undefined) return DEFAULT_BATCH_SIZE;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 1_000) {
    throw new RangeError("limit must be an integer between 1 and 1000");
  }
  return value;
}

function cursorValue(value: unknown) {
  if (!value || typeof value !== "object") return undefined;
  const after = (value as { after?: unknown }).after;
  return typeof after === "string" ? after : undefined;
}

async function loadBatch(limit: number) {
  const db = getDb();
  const [setting] = await db
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, RECONCILIATION_CURSOR_KEY))
    .limit(1);
  const after = cursorValue(setting?.value);

  const selectBatch = (afterId?: string) => db
    .select({ id: novels.id })
    .from(novels)
    .where(afterId ? and(isNull(novels.deletedAt), gt(novels.id, afterId)) : isNull(novels.deletedAt))
    .orderBy(asc(novels.id))
    .limit(limit);

  const rows = await selectBatch(after);
  if (rows.length > 0 || !after) return rows;
  return selectBatch();
}

async function reconcileNovel(novelId: string, now: Date) {
  await getDb().transaction(async (tx) => {
    await tx.insert(novelStatistics).values({ novelId }).onConflictDoNothing();
    await tx.execute(sql`select ${novelStatistics.novelId} from ${novelStatistics}
      where ${novelStatistics.novelId} = ${novelId} for update`);
    await tx
      .update(novelStatistics)
      .set({
        libraryCount: sql`(select count(*)::int from ${userLibrary} where ${userLibrary.novelId} = ${novelId})`,
        followerCount: sql`(select count(*)::int from ${novelFollows} where ${novelFollows.novelId} = ${novelId})`,
        ratingCount: sql`(select count(*)::int from ${ratings} where ${ratings.novelId} = ${novelId})`,
        ratingSum: sql`(select coalesce(sum(${ratings.score}), 0)::bigint from ${ratings}
          where ${ratings.novelId} = ${novelId})`,
        ratingAverage: sql`(select coalesce(round(avg(${ratings.score})::numeric, 2), 0) from ${ratings}
          where ${ratings.novelId} = ${novelId})`,
        reviewCount: sql`(select count(*)::int from ${reviews}
          where ${reviews.novelId} = ${novelId}
            and ${reviews.status} = 'PUBLISHED' and ${reviews.deletedAt} is null)`,
        updatedAt: now,
      })
      .where(eq(novelStatistics.novelId, novelId));
  });
}

export async function runEngagementReconciliation(options?: { execute?: boolean; limit?: number; now?: Date }) {
  const execute = options?.execute ?? process.argv.includes("--execute");
  const limit = options?.limit ?? batchSizeArgument();
  const now = options?.now ?? new Date();
  const batch = await loadBatch(limit);

  if (execute) {
    for (const novel of batch) await reconcileNovel(novel.id, now);
    await getDb()
      .insert(siteSettings)
      .values({
        key: RECONCILIATION_CURSOR_KEY,
        value: batch.length > 0 ? { after: batch.at(-1)!.id } : {},
        description: "Keyset cursor for bounded engagement aggregate reconciliation",
        isPublic: false,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: siteSettings.key,
        set: { value: batch.length > 0 ? { after: batch.at(-1)!.id } : {}, updatedAt: now },
      });
  }

  return {
    dryRun: !execute,
    selectedNovels: batch.length,
    reconciledNovels: execute ? batch.length : 0,
    nextAfter: batch.at(-1)?.id ?? null,
  };
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  runEngagementReconciliation()
    .then((result) => logger.info("Engagement aggregate reconciliation completed", result))
    .catch((error: unknown) => {
      logger.error("Engagement aggregate reconciliation failed", { error });
      process.exitCode = 1;
    })
    .finally(closeDbConnection);
}
