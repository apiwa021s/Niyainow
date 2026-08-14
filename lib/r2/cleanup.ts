import { DeleteObjectsCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { and, asc, eq, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";

import { getDb } from "@/db";
import { adminAuditLogs, authors, mediaAssets, novels, siteSettings, users } from "@/db/schema";
import { requireR2Env } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  MANAGED_OBJECT_KEY_PREFIXES,
  managedObjectKeySchema,
} from "@/lib/validation/upload";

import { getR2Client } from "./client";

export const DEFAULT_MEDIA_CLEANUP_AGE_MS = 24 * 60 * 60 * 1_000;
export const DEFAULT_MEDIA_DELETE_LIMIT = 200;
export const DEFAULT_ORPHAN_SCAN_LIMIT = 1_000;
export const DEFAULT_UNATTACHED_READY_GRACE_MS = 7 * 24 * 60 * 60 * 1_000;
const CLEANUP_CURSOR_KEY = "jobs.media_cleanup.cursor";

type CleanupCursor = {
  prefix: (typeof MANAGED_OBJECT_KEY_PREFIXES)[number];
  startAfter?: string;
};

export type MediaCleanupPolicyInput = {
  status: "PENDING" | "VERIFYING" | "READY" | "FAILED" | "ORPHANED";
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  stagingKey: string | null;
};

/** Pure policy helper used by both the job and tests. */
export function isExpiredMediaCleanupCandidate(
  media: MediaCleanupPolicyInput,
  cutoff: Date,
) {
  if (media.deletedAt) return media.deletedAt <= cutoff;
  if (media.status === "READY" && media.stagingKey && media.updatedAt <= cutoff) return true;
  if (media.status === "VERIFYING") return media.updatedAt <= cutoff;
  return ["PENDING", "FAILED", "ORPHANED"].includes(media.status) && media.createdAt <= cutoff;
}

function clampInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  if (value === undefined) return fallback;
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`Expected an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

function parseCursor(value: unknown): CleanupCursor {
  if (value && typeof value === "object") {
    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.prefix === "string" &&
      MANAGED_OBJECT_KEY_PREFIXES.includes(candidate.prefix as CleanupCursor["prefix"]) &&
      (candidate.startAfter === undefined || typeof candidate.startAfter === "string")
    ) {
      return {
        prefix: candidate.prefix as CleanupCursor["prefix"],
        ...(candidate.startAfter ? { startAfter: candidate.startAfter } : {}),
      };
    }
  }
  return { prefix: MANAGED_OBJECT_KEY_PREFIXES[0] };
}

async function loadCleanupCursor() {
  const [setting] = await getDb()
    .select({ value: siteSettings.value })
    .from(siteSettings)
    .where(eq(siteSettings.key, CLEANUP_CURSOR_KEY))
    .limit(1);
  return parseCursor(setting?.value);
}

async function saveCleanupCursor(cursor: CleanupCursor, now: Date) {
  await getDb()
    .insert(siteSettings)
    .values({
      key: CLEANUP_CURSOR_KEY,
      value: cursor,
      description: "Opaque progress cursor for bounded orphan-media scans",
      isPublic: false,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: cursor, updatedAt: now },
    });
}

async function scanOrphanCandidates(cutoff: Date, scanLimit: number) {
  const env = requireR2Env();
  let cursor = await loadCleanupCursor();
  let remaining = scanLimit;
  let scannedObjects = 0;
  let completedPrefixes = 0;
  const possibleOrphans = new Set<string>();

  while (remaining > 0 && completedPrefixes < MANAGED_OBJECT_KEY_PREFIXES.length) {
    const maxKeys = Math.min(1_000, remaining);
    const response = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME,
        Prefix: cursor.prefix,
        StartAfter: cursor.startAfter,
        MaxKeys: maxKeys,
      }),
    );
    const objects = response.Contents ?? [];
    scannedObjects += objects.length;
    remaining -= objects.length;

    for (const object of objects) {
      if (!object.Key || !object.LastModified || object.LastModified > cutoff) continue;
      const parsed = managedObjectKeySchema.safeParse(object.Key);
      if (parsed.success) possibleOrphans.add(parsed.data);
    }

    const lastKey = objects.at(-1)?.Key;
    if (response.IsTruncated && lastKey) {
      cursor = { prefix: cursor.prefix, startAfter: lastKey };
      if (objects.length === 0) break;
      continue;
    }

    const currentIndex = MANAGED_OBJECT_KEY_PREFIXES.indexOf(cursor.prefix);
    cursor = {
      prefix: MANAGED_OBJECT_KEY_PREFIXES[(currentIndex + 1) % MANAGED_OBJECT_KEY_PREFIXES.length],
    };
    completedPrefixes += 1;
    if (objects.length === 0 && completedPrefixes >= MANAGED_OBJECT_KEY_PREFIXES.length) break;
  }

  const candidateKeys = [...possibleOrphans];
  if (candidateKeys.length === 0) {
    return { orphanKeys: [] as string[], scannedObjects, nextCursor: cursor };
  }

  const knownRows = await getDb()
    .select({ objectKey: mediaAssets.objectKey, stagingKey: mediaAssets.stagingKey })
    .from(mediaAssets)
    .where(or(inArray(mediaAssets.objectKey, candidateKeys), inArray(mediaAssets.stagingKey, candidateKeys)));
  const knownKeys = new Set(knownRows.flatMap((row) => [row.objectKey, row.stagingKey].filter(Boolean) as string[]));

  return {
    orphanKeys: candidateKeys.filter((key) => !knownKeys.has(key)),
    scannedObjects,
    nextCursor: cursor,
  };
}

async function deleteObjectBatch(objectKeys: readonly string[]) {
  if (objectKeys.length === 0) return { deletedKeys: [] as string[], failedKeys: [] as string[] };
  const validatedKeys = [...new Set(objectKeys.map((key) => managedObjectKeySchema.parse(key)))];
  const env = requireR2Env();
  const response = await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: env.R2_BUCKET_NAME,
      Delete: { Objects: validatedKeys.map((Key) => ({ Key })), Quiet: true },
    }),
  );
  const failedKeys = (response.Errors ?? []).flatMap((error) => (error.Key ? [error.Key] : []));
  const failedSet = new Set(failedKeys);
  return {
    deletedKeys: validatedKeys.filter((key) => !failedSet.has(key)),
    failedKeys,
  };
}

async function claimUnattachedReadyMedia(cutoff: Date, limit: number, now: Date, claim: boolean) {
  return getDb().transaction(async (tx) => {
    // Novel/media attachment takes the same media-row lock before accepting a
    // READY key. This serializes attachment with READY -> ORPHANED cleanup.
    const candidates = await tx
      .select({ id: mediaAssets.id, objectKey: mediaAssets.objectKey })
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.status, "READY"),
          // Reconcile only media kinds whose references are normalized and
          // lock-coordinated. NOVEL_ASSET/OG may be embedded in free-form data
          // and require an explicit mutation hook instead of inference.
          inArray(mediaAssets.kind, ["COVER", "BANNER", "AVATAR"]),
          isNull(mediaAssets.deletedAt),
          isNull(mediaAssets.stagingKey),
          // Use the latest lifecycle transition, not initial authorization time:
          // an old PENDING upload may have become READY only moments ago.
          lt(mediaAssets.updatedAt, cutoff),
        ),
      )
      .orderBy(asc(mediaAssets.updatedAt), asc(mediaAssets.id))
      .limit(limit)
      .for("update", { skipLocked: true });
    const keys = candidates.map((candidate) => candidate.objectKey);
    if (keys.length === 0) return [];

    const [novelReferences, authorReferences, userReferences, settingRows] = await Promise.all([
      tx
        .select({ coverKey: novels.coverKey, bannerKey: novels.bannerKey })
        .from(novels)
        .where(or(inArray(novels.coverKey, keys), inArray(novels.bannerKey, keys))),
      tx.select({ avatarKey: authors.avatarKey }).from(authors).where(inArray(authors.avatarKey, keys)),
      tx.select({ avatarKey: users.avatarKey }).from(users).where(inArray(users.avatarKey, keys)),
      // Site settings are intentionally bounded; JSON settings may reference OG/media keys.
      tx.select({ value: siteSettings.value }).from(siteSettings).limit(10_000),
    ]);
    const referenced = new Set<string>();
    for (const row of novelReferences) {
      if (row.coverKey) referenced.add(row.coverKey);
      if (row.bannerKey) referenced.add(row.bannerKey);
    }
    for (const row of [...authorReferences, ...userReferences]) {
      if (row.avatarKey) referenced.add(row.avatarKey);
    }
    for (const row of settingRows) {
      const serialized = JSON.stringify(row.value);
      for (const key of keys) {
        if (serialized.includes(key)) referenced.add(key);
      }
    }

    const unattached = candidates.filter((candidate) => !referenced.has(candidate.objectKey));
    if (claim && unattached.length > 0) {
      await tx
        .update(mediaAssets)
        .set({ status: "ORPHANED", updatedAt: now })
        .where(
          and(
            inArray(mediaAssets.id, unattached.map((row) => row.id)),
            eq(mediaAssets.status, "READY"),
            isNull(mediaAssets.deletedAt),
          ),
        );
    }
    return unattached;
  });
}

async function claimStaleMedia(cutoff: Date, limit: number, now: Date, claim: boolean) {
  return getDb().transaction(async (tx) => {
    const rows = await tx
      .select({
        id: mediaAssets.id,
        objectKey: mediaAssets.objectKey,
        stagingKey: mediaAssets.stagingKey,
        status: mediaAssets.status,
        createdAt: mediaAssets.createdAt,
        updatedAt: mediaAssets.updatedAt,
        deletedAt: mediaAssets.deletedAt,
      })
      .from(mediaAssets)
      .where(
        or(
          and(eq(mediaAssets.status, "PENDING"), lt(mediaAssets.createdAt, cutoff)),
          and(eq(mediaAssets.status, "VERIFYING"), lt(mediaAssets.updatedAt, cutoff)),
          and(
            inArray(mediaAssets.status, ["FAILED", "ORPHANED"]),
            lt(mediaAssets.createdAt, cutoff),
          ),
          and(isNotNull(mediaAssets.deletedAt), lt(mediaAssets.deletedAt, cutoff)),
          and(
            eq(mediaAssets.status, "READY"),
            isNotNull(mediaAssets.stagingKey),
            lt(mediaAssets.updatedAt, cutoff),
          ),
        ),
      )
      .orderBy(asc(mediaAssets.createdAt), asc(mediaAssets.id))
      .limit(limit)
      .for("update", { skipLocked: true });
    const candidates = rows.filter((candidate) => isExpiredMediaCleanupCandidate(candidate, cutoff));
    const terminalIds = candidates
      .filter((candidate) => candidate.status !== "READY" || candidate.deletedAt)
      .map((candidate) => candidate.id);
    if (claim && terminalIds.length > 0) {
      // Claim lifecycle ownership before touching R2. Complete can only promote
      // a row it atomically moved PENDING -> VERIFYING, so it cannot race this.
      await tx
        .update(mediaAssets)
        .set({ status: "ORPHANED", updatedAt: now })
        .where(inArray(mediaAssets.id, terminalIds));
    }
    return candidates;
  });
}

export type CleanupExpiredMediaOptions = {
  dryRun?: boolean;
  olderThanMs?: number;
  deleteLimit?: number;
  orphanScanLimit?: number;
  includeUnattachedReady?: boolean;
  unattachedReadyGraceMs?: number;
  now?: Date;
};

/**
 * Bounded, idempotent cleanup suitable for an hourly cron/worker invocation.
 * Dry-run is the default; callers must explicitly opt into R2/DB mutations.
 */
export async function cleanupExpiredMedia(options: CleanupExpiredMediaOptions = {}) {
  const dryRun = options.dryRun ?? true;
  const olderThanMs = clampInteger(options.olderThanMs, DEFAULT_MEDIA_CLEANUP_AGE_MS, 10 * 60_000, 30 * 24 * 60 * 60_000);
  const deleteLimit = clampInteger(options.deleteLimit, DEFAULT_MEDIA_DELETE_LIMIT, 1, 1_000);
  const orphanScanLimit = clampInteger(options.orphanScanLimit, DEFAULT_ORPHAN_SCAN_LIMIT, 1, 10_000);
  const includeUnattachedReady = options.includeUnattachedReady ?? false;
  const unattachedReadyGraceMs = clampInteger(
    options.unattachedReadyGraceMs,
    DEFAULT_UNATTACHED_READY_GRACE_MS,
    24 * 60 * 60_000,
    90 * 24 * 60 * 60_000,
  );
  const now = options.now ?? new Date();
  const cutoff = new Date(now.getTime() - olderThanMs);
  const unattachedReadyCutoff = new Date(now.getTime() - unattachedReadyGraceMs);

  const staleRows = await claimStaleMedia(cutoff, deleteLimit, now, !dryRun);
  const staleRowKeys = new Map<string, string[]>();
  for (const row of staleRows.filter((candidate) => isExpiredMediaCleanupCandidate(candidate, cutoff))) {
    const candidateKeys = row.status === "READY" && !row.deletedAt
      ? [row.stagingKey]
      : [row.objectKey, row.stagingKey];
    const validKeys = candidateKeys.flatMap((key) => {
      if (!key) return [];
      const parsed = managedObjectKeySchema.safeParse(key);
      if (parsed.success) return [parsed.data];
      logger.warn("Skipping invalid persisted media key during cleanup", { mediaId: row.id });
      return [];
    });
    if (validKeys.length > 0) staleRowKeys.set(row.id, validKeys);
  }
  const staleKeys = [...staleRowKeys.values()].flat();

  const unattachedReadyRows = includeUnattachedReady
    ? await claimUnattachedReadyMedia(unattachedReadyCutoff, deleteLimit, now, !dryRun)
    : [];
  const unattachedReadyKeys = unattachedReadyRows.flatMap((row) => {
    const parsed = managedObjectKeySchema.safeParse(row.objectKey);
    if (parsed.success) return [parsed.data];
    logger.warn("Skipping invalid READY media key during reconciliation", { mediaId: row.id });
    return [];
  });

  const orphanScan = await scanOrphanCandidates(cutoff, orphanScanLimit);
  const plannedKeys = [...new Set([...staleKeys, ...unattachedReadyKeys, ...orphanScan.orphanKeys])].slice(0, deleteLimit);

  if (dryRun) {
    return {
      dryRun,
      cutoff,
      scannedObjects: orphanScan.scannedObjects,
      staleRecords: staleRows.length,
      orphanObjects: orphanScan.orphanKeys.length,
      unattachedReadyAssets: unattachedReadyRows.length,
      plannedDeletes: plannedKeys.length,
      deletedObjects: 0,
      failedDeletes: 0,
    };
  }

  const deletion = await deleteObjectBatch(plannedKeys);
  const deletedSet = new Set(deletion.deletedKeys);
  const cleanedReadyRowIds = staleRows
    .filter((row) => row.status === "READY" && !row.deletedAt && row.stagingKey && deletedSet.has(row.stagingKey))
    .map((row) => row.id);
  const cleanedTerminalRowIds = staleRows
    .filter((row) => {
      if (row.status === "READY" && !row.deletedAt) return false;
      const keys = staleRowKeys.get(row.id);
      return Boolean(keys?.length && keys.every((key) => deletedSet.has(key)));
    })
    .map((row) => row.id);
  const cleanedUnattachedReadyIds = unattachedReadyRows
    .filter((row) => deletedSet.has(row.objectKey))
    .map((row) => row.id);

  await getDb().transaction(async (tx) => {
    if (cleanedReadyRowIds.length > 0) {
      await tx
        .update(mediaAssets)
        .set({ stagingKey: null, updatedAt: now })
        .where(and(inArray(mediaAssets.id, cleanedReadyRowIds), eq(mediaAssets.status, "READY")));
    }
    if (cleanedTerminalRowIds.length > 0) {
      await tx
        .update(mediaAssets)
        .set({ stagingKey: null, deletedAt: now, updatedAt: now })
        .where(and(inArray(mediaAssets.id, cleanedTerminalRowIds), eq(mediaAssets.status, "ORPHANED")));
    }
    if (cleanedUnattachedReadyIds.length > 0) {
      await tx
        .update(mediaAssets)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(inArray(mediaAssets.id, cleanedUnattachedReadyIds), eq(mediaAssets.status, "ORPHANED")));
    }
    if (deletion.deletedKeys.length > 0) {
      await tx.insert(adminAuditLogs).values({
        action: "media.cleanup",
        entityType: "media_asset_batch",
        after: {
          deletedObjects: deletion.deletedKeys.length,
          cleanedRecords:
            cleanedReadyRowIds.length + cleanedTerminalRowIds.length + cleanedUnattachedReadyIds.length,
          cutoff: cutoff.toISOString(),
        },
        metadata: { job: "cleanupExpiredMedia" },
      });
    }
  });
  await saveCleanupCursor(orphanScan.nextCursor, now);

  return {
    dryRun,
    cutoff,
    scannedObjects: orphanScan.scannedObjects,
    staleRecords: staleRows.length,
    orphanObjects: orphanScan.orphanKeys.length,
    unattachedReadyAssets: unattachedReadyRows.length,
    plannedDeletes: plannedKeys.length,
    deletedObjects: deletion.deletedKeys.length,
    failedDeletes: deletion.failedKeys.length,
  };
}
