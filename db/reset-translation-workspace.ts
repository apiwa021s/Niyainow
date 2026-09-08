import { loadEnvConfig } from "@next/env";
import { and, count, eq } from "drizzle-orm";

import { closeDbConnection, getDb } from "./index";
import {
  novelImportSources,
  novelImportSourceTexts,
  translationChapters,
  translationJobs,
  translationWorkspaces,
} from "./schema";

loadEnvConfig(process.cwd());

function requestedWorkspaceId() {
  return process.argv.find((value) => value.startsWith("--workspace="))?.slice("--workspace=".length) ?? null;
}

async function main() {
  const db = getDb();
  const rows = await db.select({
    id: translationWorkspaces.id,
    title: novelImportSourceTexts.title,
    status: translationWorkspaces.status,
    sourceLanguage: translationWorkspaces.sourceLanguage,
    targetLanguage: translationWorkspaces.targetLanguage,
    linkedNovelId: translationWorkspaces.novelId,
    chapterCount: count(translationChapters.id),
  }).from(translationWorkspaces)
    .innerJoin(novelImportSources, eq(novelImportSources.id, translationWorkspaces.importSourceId))
    .leftJoin(novelImportSourceTexts, and(
      eq(novelImportSourceTexts.sourceId, novelImportSources.id),
      eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage),
    ))
    .leftJoin(translationChapters, eq(translationChapters.workspaceId, translationWorkspaces.id))
    .groupBy(translationWorkspaces.id, novelImportSourceTexts.title)
    .orderBy(translationWorkspaces.createdAt);

  const workspaceId = requestedWorkspaceId();
  if (!workspaceId) {
    console.info(JSON.stringify({ event: "translation_workspaces_listed", workspaces: rows }));
    return;
  }

  const target = rows.find((row) => row.id === workspaceId);
  if (!target) throw new Error("Translation workspace not found; nothing was deleted");

  const [active] = await db.select({ value: count() }).from(translationJobs).where(and(
    eq(translationJobs.workspaceId, workspaceId),
    // SQL status values are intentionally explicit so a new active state cannot be deleted silently.
    eq(translationJobs.status, "RUNNING"),
  ));
  if (Number(active?.value ?? 0) > 0) throw new Error("Workspace still has a RUNNING job; cancel it before reset");

  await db.delete(translationWorkspaces).where(eq(translationWorkspaces.id, workspaceId));
  console.info(JSON.stringify({
    event: "translation_workspace_reset",
    workspace: target,
    preservedImportedSource: true,
    preservedLinkedNovel: Boolean(target.linkedNovelId),
  }));
}

main()
  .catch((error: unknown) => {
    console.error("Failed to reset translation workspace", error instanceof Error ? error.message : "Unknown error");
    process.exitCode = 1;
  })
  .finally(closeDbConnection);
