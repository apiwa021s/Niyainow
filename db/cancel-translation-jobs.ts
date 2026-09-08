import { loadEnvConfig } from "@next/env";
import { and, eq, inArray, sql } from "drizzle-orm";

import { closeDbConnection, getDb } from "./index";
import { translationChapters, translationJobItems, translationJobs, translationWorkspaces } from "./schema";

loadEnvConfig(process.cwd());

async function main() {
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const activeJobs = await tx.select({ id: translationJobs.id, workspaceId: translationJobs.workspaceId })
      .from(translationJobs)
      .where(inArray(translationJobs.status, ["QUEUED", "RUNNING"]))
      .for("update");
    if (!activeJobs.length) return { cancelledJobs: 0, cancelledItems: 0, restoredChapters: 0 };

    const now = new Date();
    const jobIds = activeJobs.map((job) => job.id);
    const cancelledItems = await tx.update(translationJobItems).set({
      status: "CANCELLED",
      progressPercent: 100,
      progressStage: "CANCELLED",
      finishedAt: now,
      lastError: null,
    }).where(and(
      inArray(translationJobItems.jobId, jobIds),
      inArray(translationJobItems.status, ["QUEUED", "RUNNING"]),
    )).returning({ chapterId: translationJobItems.translationChapterId });

    await tx.update(translationJobs).set({
      status: "CANCELLED",
      cancelRequestedAt: now,
      finishedAt: now,
      updatedAt: now,
      lastError: null,
    }).where(inArray(translationJobs.id, jobIds));

    const chapterIds = [...new Set(cancelledItems.map((item) => item.chapterId))];
    if (chapterIds.length) {
      await tx.update(translationChapters).set({
        status: sql<string>`case when exists (select 1 from translation_versions tv where tv.translation_chapter_id = ${translationChapters.id}) then 'REVIEW' else 'READY' end`,
        updatedAt: now,
      }).where(and(
        inArray(translationChapters.id, chapterIds),
        inArray(translationChapters.status, ["QUEUED", "TRANSLATING"]),
      ));
    }

    const workspaceIds = [...new Set(activeJobs.map((job) => job.workspaceId))];
    await tx.update(translationWorkspaces).set({ status: "READY", updatedAt: now })
      .where(and(inArray(translationWorkspaces.id, workspaceIds), eq(translationWorkspaces.status, "TRANSLATING")));

    return { cancelledJobs: activeJobs.length, cancelledItems: cancelledItems.length, restoredChapters: chapterIds.length };
  });
  console.info(JSON.stringify({ event: "translation_jobs_cancelled", ...result }));
}

main()
  .catch((error: unknown) => {
    console.error("Failed to cancel translation jobs", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
