import "server-only";

import { createHash } from "node:crypto";

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { adminAuditLogs, translationMasterRecords } from "@/db/schema";
import { assertTranslationPermission } from "@/lib/auth/dal";
import {
  genreProfileSchema,
  globalRuleSchema,
  parseTranslationMasterFiles,
  presetRecipeSchema,
  sceneMasterSchema,
  type TranslationMasterBundle,
  type TranslationMasterDataset,
} from "@/lib/domain/translation-master";

export async function loadApprovedTranslationMasterBundle(): Promise<TranslationMasterBundle> {
  const rows = await getDb().select({
    dataset: translationMasterRecords.dataset,
    payload: translationMasterRecords.payload,
  }).from(translationMasterRecords).where(and(
    eq(translationMasterRecords.reviewStatus, "APPROVED"),
    eq(translationMasterRecords.isActive, true),
  ));

  const bundle: TranslationMasterBundle = { genres: [], scenes: [], globalRules: [], recipes: [] };
  for (const row of rows) {
    if (row.dataset === "GENRE_PROFILE") {
      const parsed = genreProfileSchema.safeParse(row.payload);
      if (parsed.success) bundle.genres.push(parsed.data);
    } else if (row.dataset === "SCENE") {
      const parsed = sceneMasterSchema.safeParse(row.payload);
      if (parsed.success) bundle.scenes.push(parsed.data);
    } else if (row.dataset === "GLOBAL_RULE") {
      const parsed = globalRuleSchema.safeParse(row.payload);
      if (parsed.success) bundle.globalRules.push(parsed.data);
    } else if (row.dataset === "PRESET_RECIPE") {
      const parsed = presetRecipeSchema.safeParse(row.payload);
      if (parsed.success) bundle.recipes.push(parsed.data);
    }
  }
  return bundle;
}

export async function importTranslationMasterFiles(input: {
  files: Array<{ name: string; text: string }>;
  importedBy?: string | null;
  approve?: boolean;
}) {
  const parsed = parseTranslationMasterFiles(input.files);
  const db = getDb();
  await db.transaction(async (tx) => {
    for (const record of parsed) {
      const reviewStatus = input.approve ? "APPROVED" : record.reviewStatus;
      const isActive = reviewStatus === "APPROVED";
      if (isActive) {
        await tx.update(translationMasterRecords).set({ isActive: false, updatedAt: new Date() }).where(and(
          eq(translationMasterRecords.dataset, record.dataset),
          eq(translationMasterRecords.recordKey, record.recordKey),
        ));
      }
      const contentHash = createHash("sha256").update(JSON.stringify(record.payload)).digest("hex");
      await tx.insert(translationMasterRecords).values({
        dataset: record.dataset,
        recordKey: record.recordKey,
        version: record.version,
        reviewStatus,
        isActive,
        payload: record.payload,
        sourceFile: record.sourceFile,
        contentHash,
        importedBy: input.importedBy ?? null,
        reviewedBy: input.approve ? input.importedBy ?? null : null,
        reviewedAt: input.approve ? new Date() : null,
      }).onConflictDoUpdate({
        target: [translationMasterRecords.dataset, translationMasterRecords.recordKey, translationMasterRecords.version],
        set: {
          reviewStatus,
          isActive,
          payload: record.payload,
          sourceFile: record.sourceFile,
          contentHash,
          importedBy: input.importedBy ?? null,
          reviewedBy: input.approve ? input.importedBy ?? null : null,
          reviewedAt: input.approve ? new Date() : null,
          updatedAt: new Date(),
        },
      });
    }
  });

  const counts = parsed.reduce<Partial<Record<TranslationMasterDataset, number>>>((result, record) => {
    result[record.dataset] = (result[record.dataset] ?? 0) + 1;
    return result;
  }, {});
  return { total: parsed.length, counts, approved: Boolean(input.approve) };
}

export async function getTranslationMasterOverview() {
  const rows = await getDb().select({
    dataset: translationMasterRecords.dataset,
    reviewStatus: translationMasterRecords.reviewStatus,
    isActive: translationMasterRecords.isActive,
  }).from(translationMasterRecords);
  const counts: Record<string, { total: number; draft: number; active: number }> = {};
  for (const row of rows) {
    const current = counts[row.dataset] ?? { total: 0, draft: 0, active: 0 };
    current.total += 1;
    if (row.reviewStatus === "DRAFT_FOR_EDITOR_REVIEW") current.draft += 1;
    if (row.reviewStatus === "APPROVED" && row.isActive) current.active += 1;
    counts[row.dataset] = current;
  }
  return {
    counts,
    total: rows.length,
    draft: rows.filter((row) => row.reviewStatus === "DRAFT_FOR_EDITOR_REVIEW").length,
    active: rows.filter((row) => row.reviewStatus === "APPROVED" && row.isActive).length,
    runtimeReady: rows.some((row) => row.dataset === "GENRE_PROFILE" && row.reviewStatus === "APPROVED" && row.isActive),
  };
}

export const reviewTranslationMasterSetSchema = z.object({
  action: z.enum(["APPROVE_DRAFT_SET", "REJECT_DRAFT_SET"]),
});

export async function getTranslationMasterAdminData() {
  await assertTranslationPermission("translation.view");
  const [overview, rows] = await Promise.all([
    getTranslationMasterOverview(),
    getDb().select().from(translationMasterRecords).orderBy(asc(translationMasterRecords.dataset), asc(translationMasterRecords.recordKey), asc(translationMasterRecords.version)),
  ]);
  return {
    overview,
    records: rows.map((row) => ({
      id: row.id,
      dataset: row.dataset,
      recordKey: row.recordKey,
      version: row.version,
      reviewStatus: row.reviewStatus,
      isActive: row.isActive,
      name: String(row.payload.name_th ?? row.payload.source_title ?? row.payload.metric_name ?? row.recordKey),
      sourceFile: row.sourceFile,
      updatedAt: row.updatedAt.toISOString(),
    })),
  };
}

export async function reviewTranslationMasterSet(input: z.infer<typeof reviewTranslationMasterSetSchema>) {
  const actor = await assertTranslationPermission("translation.configure");
  const db = getDb();
  return db.transaction(async (tx) => {
    const drafts = await tx.select().from(translationMasterRecords).where(eq(translationMasterRecords.reviewStatus, "DRAFT_FOR_EDITOR_REVIEW"));
    if (!drafts.length) return { changed: 0, action: input.action };

    if (input.action === "REJECT_DRAFT_SET") {
      await tx.update(translationMasterRecords).set({
        reviewStatus: "REJECTED",
        isActive: false,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(translationMasterRecords.reviewStatus, "DRAFT_FOR_EDITOR_REVIEW"));
    } else {
      const latestByKey = new Map<string, (typeof drafts)[number]>();
      for (const row of drafts) {
        const identity = `${row.dataset}:${row.recordKey}`;
        const current = latestByKey.get(identity);
        if (!current || row.version.localeCompare(current.version, undefined, { numeric: true, sensitivity: "base" }) > 0) latestByKey.set(identity, row);
      }
      const latestDrafts = [...latestByKey.values()];
      const requiredDatasets = ["RESEARCH_EVIDENCE", "GENRE_PROFILE", "SCENE", "GLOBAL_RULE", "PRESET_RECIPE"];
      const present = new Set(latestDrafts.map((row) => row.dataset));
      const missing = requiredDatasets.filter((dataset) => !present.has(dataset));
      if (missing.length) throw new Error(`Draft set is incomplete: ${missing.join(", ")}`);

      await tx.update(translationMasterRecords).set({
        reviewStatus: "ARCHIVED",
        isActive: false,
        reviewedBy: actor.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(translationMasterRecords.reviewStatus, "DRAFT_FOR_EDITOR_REVIEW"));
      for (const row of latestDrafts) {
        await tx.update(translationMasterRecords).set({ isActive: false, updatedAt: new Date() }).where(and(
          eq(translationMasterRecords.dataset, row.dataset),
          eq(translationMasterRecords.recordKey, row.recordKey),
        ));
        await tx.update(translationMasterRecords).set({
          reviewStatus: "APPROVED",
          isActive: true,
          reviewedBy: actor.id,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(translationMasterRecords.id, row.id));
      }
    }
    await tx.insert(adminAuditLogs).values({
      actorId: actor.id,
      actorRole: actor.role,
      action: input.action === "APPROVE_DRAFT_SET" ? "translation.master.approve_set" : "translation.master.reject_set",
      entityType: "translation_master_set",
      entityId: "translation-master",
      before: { draftCount: drafts.length },
      after: { changed: drafts.length, action: input.action },
    });
    return { changed: drafts.length, action: input.action };
  });
}
