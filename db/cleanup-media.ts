import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { closeDbConnection } from "@/db";
import { destroyR2Client } from "@/lib/r2/client";
import { cleanupExpiredMedia } from "@/lib/r2/cleanup";
import { logger } from "@/lib/logger";

function numericArgument(name: string) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return undefined;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be a finite number`);
  return value;
}

export async function runMediaCleanupCommand() {
  const olderThanHours = numericArgument("older-than-hours");
  const deleteLimit = numericArgument("delete-limit");
  const orphanScanLimit = numericArgument("orphan-scan-limit");
  const readyGraceHours = numericArgument("ready-grace-hours");
  const execute = process.argv.includes("--execute");
  const reconcileReady = process.argv.includes("--reconcile-unattached-ready");

  const result = await cleanupExpiredMedia({
    dryRun: !execute,
    ...(olderThanHours === undefined ? {} : { olderThanMs: olderThanHours * 60 * 60_000 }),
    ...(deleteLimit === undefined ? {} : { deleteLimit }),
    ...(orphanScanLimit === undefined ? {} : { orphanScanLimit }),
    includeUnattachedReady: reconcileReady,
    ...(readyGraceHours === undefined ? {} : { unattachedReadyGraceMs: readyGraceHours * 60 * 60_000 }),
  });
  logger.info(execute ? "Media cleanup completed" : "Media cleanup dry run completed", result);
  return result;
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isDirectRun) {
  runMediaCleanupCommand()
    .catch((error: unknown) => {
      logger.error("Media cleanup failed", { error });
      process.exitCode = 1;
    })
    .finally(async () => {
      destroyR2Client();
      await closeDbConnection();
    });
}
