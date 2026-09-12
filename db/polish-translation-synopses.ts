import { loadEnvConfig } from "@next/env";
import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { closeDbConnection, getDb } from "./index";
import {
  adminAuditLogs,
  novelImportSourceTexts,
  novels,
  translationAiModels,
  translationProfiles,
  translationWorkspaces,
} from "./schema";
import { automaticModelNameForTask } from "../lib/domain/translation-ai-routing";
import { invalidateImportedNovelCaches } from "../lib/redis/invalidation";
import { aiCallCostMicros, reviewNovelMetadataWithAi } from "../services/ai/translation-pipeline";

loadEnvConfig(process.cwd());

const translatedTexts = alias(novelImportSourceTexts, "polish_translated_source_texts");

function argument(name: string) {
  return process.argv.find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function positiveLimit() {
  const parsed = Number(argument("limit") ?? 100);
  return Number.isInteger(parsed) ? Math.max(1, Math.min(parsed, 500)) : 100;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const force = process.argv.includes("--force");
  const preview = process.argv.includes("--preview");
  const workspaceId = argument("workspace");
  const db = getDb();
  const modelName = automaticModelNameForTask("METADATA_LOCALIZATION");
  const [model] = await db.select().from(translationAiModels).where(and(
    eq(translationAiModels.modelName, modelName),
    eq(translationAiModels.isActive, true),
  )).limit(1);
  if (!model) throw new Error(`ไม่พบโมเดล ${modelName} ที่เปิดใช้งาน`);

  const rows = await db.select({
    workspace: translationWorkspaces,
    sourceTitle: novelImportSourceTexts.title,
    sourceSynopsis: novelImportSourceTexts.synopsis,
    translatedTitle: translatedTexts.title,
    translatedSynopsis: translatedTexts.synopsis,
    styleGuide: translationProfiles.styleGuide,
    instructions: translationProfiles.instructions,
    novelSlug: novels.slug,
  }).from(translationWorkspaces)
    .innerJoin(novelImportSourceTexts, and(
      eq(novelImportSourceTexts.sourceId, translationWorkspaces.importSourceId),
      eq(novelImportSourceTexts.language, translationWorkspaces.sourceLanguage),
    ))
    .innerJoin(translatedTexts, and(
      eq(translatedTexts.sourceId, translationWorkspaces.importSourceId),
      eq(translatedTexts.language, translationWorkspaces.targetLanguage),
    ))
    .leftJoin(translationProfiles, eq(translationProfiles.workspaceId, translationWorkspaces.id))
    .leftJoin(novels, eq(novels.id, translationWorkspaces.novelId))
    .where(workspaceId
      ? eq(translationWorkspaces.id, workspaceId)
      : eq(translationWorkspaces.targetLanguage, "th"))
    .orderBy(asc(translationWorkspaces.createdAt))
    .limit(positiveLimit());

  const priorRuns = force || rows.length === 0 ? [] : await db.select({ entityId: adminAuditLogs.entityId })
    .from(adminAuditLogs)
    .where(and(
      eq(adminAuditLogs.action, "translation.metadata.synopsis_polish.backfill"),
      inArray(adminAuditLogs.entityId, rows.map((row) => row.workspace.id)),
    ));
  const completedIds = new Set(priorRuns.map((row) => row.entityId));
  const candidates = rows.filter((row) => force || !completedIds.has(row.workspace.id));
  const invalidationSlugs: string[] = [];
  let changed = 0;
  let unchanged = 0;
  let failed = 0;
  let costMicros = 0;

  console.info(JSON.stringify({ event: "synopsis_polish_start", apply, force, selected: candidates.length, skipped: rows.length - candidates.length }));
  for (const [index, row] of candidates.entries()) {
    try {
      const result = await reviewNovelMetadataWithAi({
        model,
        sourceTitle: row.sourceTitle,
        sourceSynopsis: row.sourceSynopsis,
        translatedTitle: row.translatedTitle,
        translatedSynopsis: row.translatedSynopsis,
        sourceLanguage: row.workspace.sourceLanguage,
        targetLanguage: row.workspace.targetLanguage,
        profile: row.styleGuide !== null && row.instructions !== null
          ? { styleGuide: row.styleGuide, instructions: row.instructions }
          : null,
        focus: "SYNOPSIS",
      });
      const synopsis = result.value.recommendedSynopsis?.trim() || null;
      const sourceHasSynopsis = Boolean(row.sourceSynopsis?.trim());
      if (sourceHasSynopsis && (!synopsis || result.value.synopsisScore < 90 || result.value.fidelityScore < 95)) {
        throw new Error(`ผลเกลาไม่ผ่านเกณฑ์ (เรื่องย่อ ${result.value.synopsisScore}/100, ตรงต้นฉบับ ${result.value.fidelityScore}/100)`);
      }
      const hasChanged = synopsis !== (row.translatedSynopsis?.trim() || null);
      const callCostMicros = aiCallCostMicros(result.call);
      costMicros += callCostMicros;

      if (apply) {
        await db.transaction(async (tx) => {
          if (hasChanged) {
            const [updatedWorkspace] = await tx.update(translationWorkspaces).set({
              version: row.workspace.version + 1,
              updatedAt: new Date(),
            }).where(and(
              eq(translationWorkspaces.id, row.workspace.id),
              eq(translationWorkspaces.version, row.workspace.version),
            )).returning({ id: translationWorkspaces.id });
            if (!updatedWorkspace) throw new Error("ข้อมูลถูกแก้ไขระหว่างที่ AI ทำงาน กรุณารันใหม่");
            await tx.update(novelImportSourceTexts).set({ synopsis, updatedAt: new Date() }).where(and(
              eq(novelImportSourceTexts.sourceId, row.workspace.importSourceId),
              eq(novelImportSourceTexts.language, row.workspace.targetLanguage),
            ));
            if (row.workspace.novelId) {
              await tx.update(novels).set({ synopsis: synopsis ?? "", updatedAt: new Date() }).where(eq(novels.id, row.workspace.novelId));
            }
          }
          await tx.insert(adminAuditLogs).values({
            actorId: null,
            actorRole: null,
            action: "translation.metadata.synopsis_polish.backfill",
            entityType: "translation_workspace",
            entityId: row.workspace.id,
            before: { title: row.translatedTitle, synopsis: row.translatedSynopsis },
            after: { title: row.translatedTitle, synopsis },
            metadata: {
              modelName: model.modelName,
              providerRequestId: result.call.result.providerRequestId,
              titleScore: result.value.score,
              synopsisScore: result.value.synopsisScore,
              fidelityScore: result.value.fidelityScore,
              costMicros: callCostMicros,
              prompt: "metadata-localization-v1",
            },
          });
        });
        if (hasChanged && row.novelSlug) invalidationSlugs.push(row.novelSlug);
      }

      if (hasChanged) changed += 1;
      else unchanged += 1;
      console.info(JSON.stringify({
        event: "synopsis_polish_item",
        current: index + 1,
        total: candidates.length,
        workspaceId: row.workspace.id,
        title: row.translatedTitle,
        changed: hasChanged,
        scores: { title: result.value.score, synopsis: result.value.synopsisScore, fidelity: result.value.fidelityScore },
        ...(preview ? { synopsis } : {}),
      }));
    } catch (error) {
      failed += 1;
      console.error(JSON.stringify({
        event: "synopsis_polish_failed",
        current: index + 1,
        total: candidates.length,
        workspaceId: row.workspace.id,
        title: row.translatedTitle,
        error: error instanceof Error ? error.message : "Unknown error",
      }));
    }
  }

  if (apply && invalidationSlugs.length > 0) await invalidateImportedNovelCaches(invalidationSlugs);
  console.info(JSON.stringify({ event: "synopsis_polish_complete", apply, selected: candidates.length, changed, unchanged, failed, costMicros }));
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error("Synopsis polish failed", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
}).finally(closeDbConnection);
