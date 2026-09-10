import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

import { getDb } from "@/db";
import {
  adminAuditLogs,
  chapters,
  domainOutboxEvents,
  novelImportChapters,
  novelImportChapterTexts,
  novelImportSources,
  novelImportSourceTexts,
  novelSearchDocuments,
  novelStatistics,
  novels,
  translationAiModels,
  translationAiInvocations,
  translationCharacters,
  translationChapters,
  translationGlossaryEntries,
  translationJobItems,
  translationJobs,
  translationProfiles,
  translationProfileVersions,
  translationPromptVersions,
  translationQaIssues,
  translationSourceSegments,
  translationSourceSnapshots,
  translationVersions,
  translationWorkspaces,
} from "@/db/schema";
import { assertTranslationPermission, type CurrentUser } from "@/lib/auth/dal";
import {
  AUTOMATIC_TRANSLATION_MODELS,
  AUTOMATIC_TRANSLATION_SYSTEM_PROMPT,
  automaticModelNameForTask,
  type AutomaticTranslationTask,
} from "@/lib/domain/translation-ai-routing";
import { countWords, segmentText, selectBestTranslationModel } from "@/lib/domain/translation";
import { ApiError } from "@/lib/http/api-response";
import { invalidateChapterCache, invalidateNovelCache } from "@/lib/redis/invalidation";
import { assetUrl, publicAssetFallbacks } from "@/lib/site-config";
import { createUniqueSlug, selectReadableSlugSource } from "@/lib/validation/slug";
import { aiCallCostMicros, generateAiTranslationProfile, reviewNovelTitleWithAi, type AiStageEvent } from "@/services/ai/translation-pipeline";
import { getTranslationMasterOverview, loadApprovedTranslationMasterBundle } from "@/services/translation-master-service";
import { insertTranslationVersion, replaceQaIssues } from "@/services/translation-version-service";

const languageSchema = z.string().trim().regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/).max(35).transform((value) => value.toLocaleLowerCase());
const uuidSchema = z.uuid();
const translatedImportSourceTexts = alias(novelImportSourceTexts, "translated_import_source_texts");
const storedAiPipelineSchema = z.array(z.object({
  task: z.string(),
  modelName: z.string(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  costMicros: z.number().int().nonnegative(),
  status: z.string(),
}));
const storedTitleReviewSchema = z.object({
  reviewedTitle: z.string(),
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["NATURAL", "NEEDS_REVISION"]),
  issues: z.array(z.string()),
  recommendedTitle: z.string(),
  candidates: z.array(z.object({ title: z.string(), rationale: z.string() })),
  modelName: z.string(),
  latencyMs: z.number().int().nonnegative(),
  reviewedAt: z.string(),
});
const storedProfileAnalysisSchema = z.object({
  genre: z.string(),
  subgenres: z.array(z.string()),
  tone: z.string(),
  narrativeVoice: z.string(),
  terminologyRisks: z.array(z.string()),
  translationStrategy: z.string(),
  masterRouting: z.object({
    baseProfileId: z.string().nullable(),
    overlayProfileIds: z.array(z.string()),
    recipeId: z.string().nullable(),
    confidence: z.number().int().min(0).max(100),
    reason: z.string(),
    sourceSignals: z.array(z.string()),
  }).optional(),
  genreContext: z.object({ key: z.string(), label: z.string(), guidance: z.string() }),
  masterSelection: z.object({
    mode: z.enum(["MASTER", "LEGACY_FALLBACK"]),
    routing: z.object({
      method: z.enum(["AI_VALIDATED", "DETERMINISTIC", "LEGACY_FALLBACK"]),
      confidence: z.number().int().min(0).max(100).nullable(),
      reason: z.string().nullable(),
      sourceSignals: z.array(z.string()),
    }).optional(),
    baseProfile: z.object({ id: z.string(), version: z.string(), name: z.string() }).nullable(),
    overlays: z.array(z.object({ id: z.string(), version: z.string(), name: z.string() })),
    recipe: z.object({ id: z.string(), version: z.string(), name: z.string() }).nullable(),
    sceneCandidates: z.array(z.object({ id: z.string(), version: z.string(), name: z.string() })),
    globalRuleVersions: z.array(z.string()),
  }).optional(),
  profileReviewNotes: z.array(z.string()),
  sampledChapters: z.array(z.number().int().positive()),
});

export const createTranslationWorkspaceSchema = z.object({
  importSourceId: uuidSchema,
  targetLanguage: languageSchema,
  regenerate: z.boolean().default(false),
});

const glossaryEntrySchema = z.object({
  id: uuidSchema.optional(),
  sourceTerm: z.string().trim().min(1).max(300),
  targetTerm: z.string().trim().min(1).max(300),
  note: z.string().trim().max(1_000).nullable().optional(),
  isLocked: z.boolean().default(true),
});

const characterSchema = z.object({
  id: uuidSchema.optional(),
  sourceName: z.string().trim().min(1).max(300),
  targetName: z.string().trim().min(1).max(300),
  aliases: z.array(z.string().trim().min(1).max(300)).max(30).default([]),
  description: z.string().trim().max(3_000).nullable().optional(),
  speakingStyle: z.string().trim().max(3_000).nullable().optional(),
  isLocked: z.boolean().default(true),
});

export const configureTranslationWorkspaceSchema = z.object({
  expectedVersion: z.number().int().positive(),
  metadata: z.object({
    title: z.string().trim().min(1).max(1_000),
    synopsis: z.string().trim().max(20_000).nullable(),
  }),
  profile: z.object({
    name: z.string().trim().min(1).max(160),
    styleGuide: z.string().trim().max(20_000),
    instructions: z.string().trim().max(20_000),
    preserveParagraphs: z.boolean(),
  }),
  glossary: z.array(glossaryEntrySchema).max(2_000),
  characters: z.array(characterSchema).max(1_000),
});

export const reviewTranslationTitleSchema = z.object({
  title: z.string().trim().min(1).max(1_000),
  synopsis: z.string().trim().max(20_000).nullable(),
});

export const createTranslationModelSchema = z.object({
  name: z.string().trim().min(1).max(160),
  provider: z.literal("openai-compatible"),
  modelName: z.string().trim().min(1).max(200),
  baseUrl: z.url().refine((value) => isSafeProviderUrl(value), "Provider URL must be a public HTTPS URL"),
  apiKeyEnv: z.string().trim().regex(/^AI_[A-Z0-9_]{1,116}$/),
  inputCostMicrosPerMillion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  outputCostMicrosPerMillion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
  selectionPriority: z.number().int().min(0).max(1_000).default(100),
  supportedLanguagePairs: z.array(z.string().trim().regex(/^(?:\*|(?:\*|[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*)>(?:\*|[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*))$/)).min(1).max(100).default(["*"]),
  promptName: z.string().trim().min(1).max(160),
  systemPrompt: z.string().trim().min(20).max(30_000),
});

export const enqueueTranslationSchema = z.object({
  modelId: uuidSchema.optional(),
  promptVersionId: uuidSchema.optional(),
  chapterIds: z.array(uuidSchema).min(1).max(100),
  idempotencyKey: z.string().trim().min(16).max(255),
});

export const saveTranslationSchema = z.object({
  expectedLockVersion: z.number().int().positive(),
  parentVersionId: uuidSchema.nullable().optional(),
  title: z.string().trim().min(1).max(1_000),
  content: z.string().trim().min(1).max(2_000_000),
});

function isSafeProviderUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host !== "localhost"
      && host !== "127.0.0.1"
      && host !== "::1"
      && !host.endsWith(".local")
      && !/^10\./.test(host)
      && !/^192\.168\./.test(host)
      && !/^172\.(1[6-9]|2\d|3[01])\./.test(host)
      && !/^169\.254\./.test(host);
  } catch {
    return false;
  }
}

function auditValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function writeAudit(tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0], actor: CurrentUser, action: string, entityType: string, entityId: string, before: unknown, after: unknown) {
  await tx.insert(adminAuditLogs).values({
    actorId: actor.id,
    actorRole: actor.role,
    action,
    entityType,
    entityId,
    before: auditValue(before),
    after: auditValue(after),
  });
}

function serializeWorkspace(row: typeof translationWorkspaces.$inferSelect) {
  return { id: row.id, importSourceId: row.importSourceId, novelId: row.novelId, sourceLanguage: row.sourceLanguage, targetLanguage: row.targetLanguage, status: row.status, version: row.version };
}

async function ensureAutomaticAiConfiguration(actor: CurrentUser) {
  const baseUrl = (process.env.AI_TRANSLATION_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  if (!isSafeProviderUrl(baseUrl)) throw new ApiError(500, "AI_BASE_URL_INVALID", "AI_TRANSLATION_BASE_URL ต้องเป็น public HTTPS URL");
  const db = getDb();
  const expectedModelNames = AUTOMATIC_TRANSLATION_MODELS.map((model) => model.modelName);
  const [existingModels, existingPrompt] = await Promise.all([
    db.select({ modelName: translationAiModels.modelName }).from(translationAiModels)
      .where(and(eq(translationAiModels.provider, "openai-compatible"), eq(translationAiModels.isActive, true), inArray(translationAiModels.modelName, expectedModelNames))),
    db.select({ id: translationPromptVersions.id }).from(translationPromptVersions)
      .where(and(eq(translationPromptVersions.name, "automatic-novel-translation"), eq(translationPromptVersions.version, 1), eq(translationPromptVersions.isActive, true))).limit(1),
  ]);
  if (existingModels.length === AUTOMATIC_TRANSLATION_MODELS.length && existingPrompt.length) return;
  await db.transaction(async (tx) => {
    for (const model of AUTOMATIC_TRANSLATION_MODELS) {
      await tx.insert(translationAiModels).values({
        name: `Automatic · ${model.name}`,
        provider: "openai-compatible",
        modelName: model.modelName,
        baseUrl,
        apiKeyEnv: "AI_TRANSLATION_API_KEY",
        inputCostMicrosPerMillion: model.inputCostMicrosPerMillion,
        outputCostMicrosPerMillion: model.outputCostMicrosPerMillion,
        selectionPriority: 100,
        supportedLanguagePairs: ["*"],
        isActive: true,
        createdBy: actor.id,
      }).onConflictDoUpdate({
        target: [translationAiModels.provider, translationAiModels.modelName],
        set: {
          name: `Automatic · ${model.name}`,
          baseUrl,
          apiKeyEnv: "AI_TRANSLATION_API_KEY",
          inputCostMicrosPerMillion: model.inputCostMicrosPerMillion,
          outputCostMicrosPerMillion: model.outputCostMicrosPerMillion,
          supportedLanguagePairs: ["*"],
          isActive: true,
          updatedAt: new Date(),
        },
      });
    }
    await tx.insert(translationPromptVersions).values({
      name: "automatic-novel-translation",
      version: 1,
      systemPrompt: AUTOMATIC_TRANSLATION_SYSTEM_PROMPT,
      isActive: true,
      createdBy: actor.id,
    }).onConflictDoNothing();
  });
}

async function getAutomaticModels<T extends AutomaticTranslationTask>(tasks: readonly T[]) {
  const names = tasks.map(automaticModelNameForTask);
  const rows = await getDb().select().from(translationAiModels).where(and(
    eq(translationAiModels.isActive, true),
    inArray(translationAiModels.modelName, names),
  ));
  const byName = new Map(rows.map((row) => [row.modelName, row]));
  const entries = tasks.map((task) => {
    const model = byName.get(automaticModelNameForTask(task));
    if (!model) throw new ApiError(409, "AI_CONFIG_UNAVAILABLE", `ไม่พบโมเดลสำหรับขั้นตอน ${task}`);
    return [task, model] as const;
  });
  return Object.fromEntries(entries) as Record<T, (typeof rows)[number]>;
}

function uniqueBySource<T extends { sourceTerm?: string; sourceName?: string }>(rows: T[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = (row.sourceTerm ?? row.sourceName ?? "").trim().toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Pulls new/changed imported chapters into immutable source snapshots without touching old translations. */
export async function syncTranslationWorkspaceSources(workspaceId: string) {
  const actor = await assertTranslationPermission("translation.configure");
  const db = getDb();
  const [workspace] = await db.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new ApiError(404, "TRANSLATION_WORKSPACE_NOT_FOUND", "ไม่พบ Translation Workspace");

  const imported = await db.select({
    importChapterId: novelImportChapters.id,
    chapterNumber: novelImportChapters.chapterNumber,
    title: novelImportChapterTexts.title,
    content: novelImportChapterTexts.content,
    sourceHash: novelImportChapterTexts.contentHash,
    sourceVersion: novelImportChapterTexts.version,
  }).from(novelImportChapters)
    .innerJoin(novelImportChapterTexts, and(
      eq(novelImportChapterTexts.chapterId, novelImportChapters.id),
      eq(novelImportChapterTexts.language, workspace.sourceLanguage),
      eq(novelImportChapterTexts.textKind, "source"),
    ))
    .where(eq(novelImportChapters.sourceId, workspace.importSourceId))
    .orderBy(asc(novelImportChapters.chapterNumber));

  const usable = imported.filter((row): row is typeof row & { content: string } => Boolean(row.content?.trim()));
  if (!usable.length) return { added: 0, changed: 0, total: 0 };

  const importIds = usable.map((row) => row.importChapterId);
  const [existingSnapshots, existingChapters] = await Promise.all([
    db.select().from(translationSourceSnapshots).where(and(
      eq(translationSourceSnapshots.workspaceId, workspace.id),
      inArray(translationSourceSnapshots.importChapterId, importIds),
    )),
    db.select().from(translationChapters).where(and(
      eq(translationChapters.workspaceId, workspace.id),
      inArray(translationChapters.importChapterId, importIds),
    )),
  ]);
  const snapshotByIdentity = new Map(existingSnapshots.map((row) => [`${row.importChapterId}:${row.sourceHash}`, row]));
  const chapterByImportId = new Map(existingChapters.map((row) => [row.importChapterId, row]));

  const missingSnapshots = usable.filter((row) => !snapshotByIdentity.has(`${row.importChapterId}:${row.sourceHash}`));
  const added = usable.filter((row) => !chapterByImportId.has(row.importChapterId)).length;
  let changed = 0;
  await db.transaction(async (tx) => {
    for (let start = 0; start < missingSnapshots.length; start += 500) {
      const batch = missingSnapshots.slice(start, start + 500);
      const created = await tx.insert(translationSourceSnapshots).values(batch.map((row) => ({
          workspaceId: workspace.id,
          importChapterId: row.importChapterId,
          sourceLanguage: workspace.sourceLanguage,
          sourceVersion: row.sourceVersion,
          sourceHash: row.sourceHash,
          title: row.title,
          content: row.content,
      }))).returning();
      for (const snapshot of created) snapshotByIdentity.set(`${snapshot.importChapterId}:${snapshot.sourceHash}`, snapshot);
    }

    const segmentRows = missingSnapshots.flatMap((row) => {
      const snapshot = snapshotByIdentity.get(`${row.importChapterId}:${row.sourceHash}`)!;
      return segmentText(row.content).map((segment) => ({ ...segment, sourceSnapshotId: snapshot.id }));
    });
    for (let start = 0; start < segmentRows.length; start += 1_000) {
      await tx.insert(translationSourceSegments).values(segmentRows.slice(start, start + 1_000));
    }

    const newChapterRows = usable.filter((row) => !chapterByImportId.has(row.importChapterId)).map((row) => ({
      workspaceId: workspace.id,
      importChapterId: row.importChapterId,
      sourceSnapshotId: snapshotByIdentity.get(`${row.importChapterId}:${row.sourceHash}`)!.id,
      linkedChapterId: null,
      chapterNumber: row.chapterNumber,
    }));
    for (let start = 0; start < newChapterRows.length; start += 1_000) {
      await tx.insert(translationChapters).values(newChapterRows.slice(start, start + 1_000)).onConflictDoNothing();
    }

    for (const row of usable) {
      const snapshot = snapshotByIdentity.get(`${row.importChapterId}:${row.sourceHash}`)!;
      const current = chapterByImportId.get(row.importChapterId);
      if (current && current.sourceSnapshotId !== snapshot.id) {
        await tx.update(translationChapters).set({ sourceSnapshotId: snapshot.id, status: "STALE", lockVersion: current.lockVersion + 1, updatedAt: new Date() })
          .where(eq(translationChapters.id, current.id));
        changed += 1;
      }
    }
    if (added || changed) {
      await tx.update(translationWorkspaces).set({
        status: workspace.status === "SETUP" ? "SETUP" : workspace.status === "TRANSLATING" ? "TRANSLATING" : "READY",
        version: workspace.version + 1,
        updatedAt: new Date(),
      }).where(eq(translationWorkspaces.id, workspace.id));
      await writeAudit(tx, actor, "translation.sources.sync", "translation_workspace", workspace.id, null, { added, changed, total: usable.length });
    }
  });
  return { added, changed, total: usable.length };
}

export async function createTranslationWorkspace(
  input: z.infer<typeof createTranslationWorkspaceSchema>,
  onStage?: (event: AiStageEvent) => void | Promise<void>,
) {
  const actor = await assertTranslationPermission("translation.configure");
  if (!process.env.AI_TRANSLATION_API_KEY?.trim()) {
    throw new ApiError(409, "AI_CREDENTIAL_MISSING", "กรุณาตั้ง AI_TRANSLATION_API_KEY ใน environment ของ server");
  }
  await ensureAutomaticAiConfiguration(actor);
  const db = getDb();
  const [source] = await db.select().from(novelImportSources).where(eq(novelImportSources.id, input.importSourceId)).limit(1);
  if (!source) throw new ApiError(404, "IMPORT_SOURCE_NOT_FOUND", "ไม่พบเรื่องที่นำเข้า");
  if (source.sourceLanguage.toLowerCase() === input.targetLanguage.toLowerCase()) {
    throw new ApiError(400, "LANGUAGES_MUST_DIFFER", "ภาษาต้นทางและภาษาปลายทางต้องไม่ซ้ำกัน");
  }
  const [sourceText] = await db.select().from(novelImportSourceTexts).where(and(
    eq(novelImportSourceTexts.sourceId, source.id),
    eq(novelImportSourceTexts.language, source.sourceLanguage),
  )).limit(1);
  if (!sourceText) throw new ApiError(409, "IMPORT_METADATA_MISSING", "เรื่องที่นำเข้ายังไม่มีชื่อเรื่องต้นฉบับ");

  const [existingWorkspace] = await db.select().from(translationWorkspaces).where(and(
    eq(translationWorkspaces.importSourceId, source.id),
    eq(translationWorkspaces.targetLanguage, input.targetLanguage),
  )).limit(1);
  if (existingWorkspace) {
    const [existingProfile] = await db.select({ version: translationProfiles.version }).from(translationProfiles)
      .where(eq(translationProfiles.workspaceId, existingWorkspace.id)).limit(1);
    if (!input.regenerate && (existingWorkspace.status !== "SETUP" || (existingProfile?.version ?? 0) > 1)) {
      await syncTranslationWorkspaceSources(existingWorkspace.id);
      return existingWorkspace;
    }
    if (input.regenerate) {
      const [activeJob] = await db.select({ id: translationJobs.id }).from(translationJobs).where(and(
        eq(translationJobs.workspaceId, existingWorkspace.id),
        inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
      )).limit(1);
      if (activeJob) throw new ApiError(409, "TRANSLATION_JOB_ACTIVE", "รอให้งานแปลปัจจุบันเสร็จก่อนสร้าง Profile ใหม่");
    }
  }

  const sampleRows = await db.select({
    chapterNumber: novelImportChapters.chapterNumber,
    title: novelImportChapterTexts.title,
    content: novelImportChapterTexts.content,
  }).from(novelImportChapters).innerJoin(novelImportChapterTexts, and(
    eq(novelImportChapterTexts.chapterId, novelImportChapters.id),
    eq(novelImportChapterTexts.language, source.sourceLanguage),
    eq(novelImportChapterTexts.textKind, "source"),
  )).where(eq(novelImportChapters.sourceId, source.id)).orderBy(asc(novelImportChapters.chapterNumber)).limit(3);
  const samples = sampleRows.filter((row): row is typeof row & { content: string } => Boolean(row.content?.trim()));
  if (!samples.length && !sourceText.synopsis?.trim()) {
    throw new ApiError(409, "PROFILE_CONTEXT_MISSING", "ต้องมีเรื่องย่อหรือตอนต้นฉบับอย่างน้อย 1 ตอนเพื่อสร้าง Translation Profile คุณภาพสูง");
  }
  const [models, masterBundle] = await Promise.all([
    getAutomaticModels(["PROFILE_ANALYSIS", "FOUNDATION", "PROFILE_QUALITY_REVIEW", "ENTITY_EXTRACTION"] as const),
    loadApprovedTranslationMasterBundle(),
  ]);
  if (!masterBundle.genres.some((profile) => profile.profile_kind === "BASE_GENRE")) {
    throw new ApiError(409, "TRANSLATION_MASTER_NOT_READY", "กรุณาตรวจและอนุมัติ Translation Master ก่อนสร้าง Profile พร้อมใช้");
  }
  const generated = await generateAiTranslationProfile({
    title: sourceText.title,
    synopsis: sourceText.synopsis,
    sourceLanguage: source.sourceLanguage,
    targetLanguage: input.targetLanguage,
    samples,
    masterBundle,
    models,
    onStage,
  });
  const glossary = uniqueBySource(generated.glossary);
  const characters = uniqueBySource(generated.characters);
  const aiPipeline = generated.calls.map((call) => ({
    task: call.task,
    modelId: call.model.id,
    modelName: call.model.modelName,
    providerRequestId: call.result.providerRequestId,
    inputTokens: call.result.inputTokens,
    outputTokens: call.result.outputTokens,
    latencyMs: call.result.latencyMs,
    costMicros: aiCallCostMicros(call),
    status: "SUCCESS",
  }));

  const workspace = await db.transaction(async (tx) => {
    const persistTranslatedMetadata = () => tx.insert(novelImportSourceTexts).values({
      sourceId: source.id,
      language: input.targetLanguage,
      textKind: "translation",
      translationStatus: "approved",
      title: generated.metadata.title,
      synopsis: generated.metadata.synopsis,
    }).onConflictDoUpdate({
      target: [novelImportSourceTexts.sourceId, novelImportSourceTexts.language],
      set: {
        textKind: "translation",
        translationStatus: "approved",
        title: generated.metadata.title,
        synopsis: generated.metadata.synopsis,
        updatedAt: new Date(),
      },
    });

    if (existingWorkspace) {
      const [current] = await tx.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, existingWorkspace.id)).limit(1).for("update");
      const [currentProfile] = await tx.select().from(translationProfiles).where(eq(translationProfiles.workspaceId, existingWorkspace.id)).limit(1).for("update");
      if (!current) throw new ApiError(404, "TRANSLATION_WORKSPACE_NOT_FOUND", "ไม่พบ Translation Workspace");
      if (!input.regenerate && (current.status !== "SETUP" || (currentProfile?.version ?? 0) > 1)) return current;
      if (input.regenerate) {
        const [activeJob] = await tx.select({ id: translationJobs.id }).from(translationJobs).where(and(
          eq(translationJobs.workspaceId, current.id),
          inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
        )).limit(1);
        if (activeJob) throw new ApiError(409, "TRANSLATION_JOB_ACTIVE", "รอให้งานแปลปัจจุบันเสร็จก่อนสร้าง Profile ใหม่");
      }
      const nextVersion = current.version + 1;
      const [updated] = await tx.update(translationWorkspaces).set({
        status: current.status === "SETUP" ? "READY" : current.status,
        version: nextVersion,
        updatedAt: new Date(),
      })
        .where(eq(translationWorkspaces.id, current.id)).returning();
      await tx.insert(translationProfiles).values({ workspaceId: current.id, ...generated.profile, version: nextVersion, updatedBy: actor.id })
        .onConflictDoUpdate({ target: translationProfiles.workspaceId, set: { ...generated.profile, version: nextVersion, updatedBy: actor.id, updatedAt: new Date() } });
      await persistTranslatedMetadata();
      if (input.regenerate) {
        await tx.update(translationChapters).set({ status: "STALE", updatedAt: new Date() }).where(and(
          eq(translationChapters.workspaceId, current.id),
          inArray(translationChapters.status, ["DRAFT", "QA_FAILED", "REVIEW", "APPROVED", "FAILED"]),
        ));
      }
      if (!input.regenerate) {
        await tx.delete(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, current.id));
        await tx.delete(translationCharacters).where(eq(translationCharacters.workspaceId, current.id));
      }
      // AI-extracted terms are suggestions until an editor explicitly locks them.
      // Treating every generated term as binding caused ordinary/polysemous words
      // such as "gate" to block otherwise valid chapter translations.
      if (glossary.length) await tx.insert(translationGlossaryEntries).values(glossary.map((entry) => ({ ...entry, isLocked: false, workspaceId: current.id, createdBy: actor.id }))).onConflictDoNothing();
      if (characters.length) await tx.insert(translationCharacters).values(characters.map((entry) => ({ ...entry, isLocked: true, workspaceId: current.id, createdBy: actor.id }))).onConflictDoNothing();
      await tx.insert(translationProfileVersions).values({
        workspaceId: current.id,
        version: nextVersion,
        snapshot: { profile: generated.profile, metadata: generated.metadata, glossary, characters, analysis: generated.analysis, aiPipeline, source: { title: sourceText.title, synopsis: sourceText.synopsis } },
        createdBy: actor.id,
      });
      await writeAudit(tx, actor, input.regenerate ? "translation.profile.ai_regenerate" : "translation.profile.ai_generate", "translation_workspace", current.id, serializeWorkspace(current), serializeWorkspace(updated));
      return updated;
    }

    const [created] = await tx.insert(translationWorkspaces).values({
      importSourceId: source.id,
      novelId: null,
      sourceLanguage: source.sourceLanguage,
      targetLanguage: input.targetLanguage,
      status: "READY",
      createdBy: actor.id,
      assignedEditorId: actor.id,
    }).onConflictDoNothing({ target: [translationWorkspaces.importSourceId, translationWorkspaces.targetLanguage] }).returning();
    if (!created) throw new ApiError(409, "TRANSLATION_WORKSPACE_CONFLICT", "มีการสร้าง Workspace เดียวกันจากหน้าต่างอื่น กรุณาลองใหม่");
    await tx.insert(translationProfiles).values({ workspaceId: created.id, ...generated.profile, updatedBy: actor.id });
    await persistTranslatedMetadata();
    if (glossary.length) await tx.insert(translationGlossaryEntries).values(glossary.map((entry) => ({ ...entry, isLocked: false, workspaceId: created.id, createdBy: actor.id })));
    if (characters.length) await tx.insert(translationCharacters).values(characters.map((entry) => ({ ...entry, isLocked: true, workspaceId: created.id, createdBy: actor.id })));
    await tx.insert(translationProfileVersions).values({
      workspaceId: created.id,
      version: 1,
      snapshot: { profile: generated.profile, metadata: generated.metadata, glossary, characters, analysis: generated.analysis, aiPipeline, source: { title: sourceText.title, synopsis: sourceText.synopsis } },
      createdBy: actor.id,
    });
    await writeAudit(tx, actor, "translation.workspace.create_with_ai_profile", "translation_workspace", created.id, null, serializeWorkspace(created));
    return created;
  });

  await syncTranslationWorkspaceSources(workspace.id);
  return workspace;
}

export async function getTranslationStudio() {
  const actor = await assertTranslationPermission("translation.view");
  await ensureAutomaticAiConfiguration(actor);
  const db = getDb();
  const [workspaceRows, sourceRows, modelRows, promptRows, masterData] = await Promise.all([
    db.select({
      workspace: translationWorkspaces,
      sourceTitle: novelImportSourceTexts.title,
      translatedTitle: translatedImportSourceTexts.title,
      chapterCount: sql<number>`(select count(*) from translation_chapters tc where tc.workspace_id = ${translationWorkspaces.id})`.mapWith(Number),
      approvedCount: sql<number>`(select count(*) from translation_chapters tc where tc.workspace_id = ${translationWorkspaces.id} and tc.status in ('APPROVED','PUBLISHED'))`.mapWith(Number),
      jobCostMicros: sql<number>`
        coalesce((select sum(ai.cost_micros) from translation_ai_invocations ai join translation_job_items ji on ji.id = ai.job_item_id join translation_jobs j on j.id = ji.job_id where j.workspace_id = ${translationWorkspaces.id}), 0)
        + coalesce((select sum((call->>'costMicros')::bigint) from translation_profile_versions tpv cross join lateral jsonb_array_elements(coalesce(tpv.snapshot->'aiPipeline', '[]'::jsonb)) call where tpv.workspace_id = ${translationWorkspaces.id}), 0)
      `.mapWith(Number),
    }).from(translationWorkspaces)
      .innerJoin(novelImportSources, eq(novelImportSources.id, translationWorkspaces.importSourceId))
      .leftJoin(novelImportSourceTexts, and(eq(novelImportSourceTexts.sourceId, novelImportSources.id), eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage)))
      .leftJoin(translatedImportSourceTexts, and(
        eq(translatedImportSourceTexts.sourceId, novelImportSources.id),
        eq(translatedImportSourceTexts.language, translationWorkspaces.targetLanguage),
      ))
      .orderBy(desc(translationWorkspaces.updatedAt)),
    db.select({
      id: novelImportSources.id,
      sourceLanguage: novelImportSources.sourceLanguage,
      provider: novelImportSources.provider,
      coverKey: novelImportSources.coverKey,
      title: novelImportSourceTexts.title,
      synopsis: novelImportSourceTexts.synopsis,
      chapterCount: sql<number>`(select count(*) from novel_import_chapters nic where nic.source_id = ${novelImportSources.id})`.mapWith(Number),
    })
      .from(novelImportSources)
      .leftJoin(novelImportSourceTexts, and(eq(novelImportSourceTexts.sourceId, novelImportSources.id), eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage)))
      .where(eq(novelImportSources.status, "ready")).orderBy(desc(novelImportSources.updatedAt)),
    db.select().from(translationAiModels).where(eq(translationAiModels.isActive, true)).orderBy(asc(translationAiModels.name)),
    db.select().from(translationPromptVersions).where(eq(translationPromptVersions.isActive, true)).orderBy(desc(translationPromptVersions.createdAt)),
    getTranslationMasterOverview(),
  ]);
  return {
    workspaces: workspaceRows.map(({ workspace, sourceTitle, translatedTitle, chapterCount, approvedCount, jobCostMicros }) => ({
      ...serializeWorkspace(workspace), title: translatedTitle ?? sourceTitle ?? "Imported novel", sourceTitle: sourceTitle ?? "Imported novel", chapterCount, approvedCount, jobCostMicros, updatedAt: workspace.updatedAt.toISOString(),
    })),
    sources: sourceRows.map((row) => ({
      ...row,
      title: row.title ?? "Imported novel",
      coverUrl: assetUrl(row.coverKey, publicAssetFallbacks.novelCover),
    })),
    models: modelRows.map((row) => ({ ...row, inputCostMicrosPerMillion: Number(row.inputCostMicrosPerMillion), outputCostMicrosPerMillion: Number(row.outputCostMicrosPerMillion), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    prompts: promptRows.map((row) => ({ id: row.id, name: row.name, version: row.version })),
    masterData,
  };
}

export async function getTranslationWorkspace(workspaceId: string) {
  await assertTranslationPermission("translation.view");
  if (!uuidSchema.safeParse(workspaceId).success) return undefined;
  const db = getDb();
  const [workspace] = await db.select({
    workspace: translationWorkspaces,
    sourceTitle: novelImportSourceTexts.title,
    sourceSynopsis: novelImportSourceTexts.synopsis,
    translatedTitle: translatedImportSourceTexts.title,
    translatedSynopsis: translatedImportSourceTexts.synopsis,
    provider: novelImportSources.provider,
    importReference: novelImportSources.importReference,
  }).from(translationWorkspaces)
    .innerJoin(novelImportSources, eq(novelImportSources.id, translationWorkspaces.importSourceId))
    .leftJoin(novelImportSourceTexts, and(eq(novelImportSourceTexts.sourceId, novelImportSources.id), eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage)))
    .leftJoin(translatedImportSourceTexts, and(
      eq(translatedImportSourceTexts.sourceId, novelImportSources.id),
      eq(translatedImportSourceTexts.language, translationWorkspaces.targetLanguage),
    ))
    .where(eq(translationWorkspaces.id, workspaceId)).limit(1);
  if (!workspace) return undefined;
  const [profile, glossary, characters, chapterRows, jobs, models, prompts, profileVersions, titleReviewRows, aiUsageRows] = await Promise.all([
    db.select().from(translationProfiles).where(eq(translationProfiles.workspaceId, workspaceId)).limit(1),
    db.select().from(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, workspaceId)).orderBy(asc(translationGlossaryEntries.sourceTerm)),
    db.select().from(translationCharacters).where(eq(translationCharacters.workspaceId, workspaceId)).orderBy(asc(translationCharacters.sourceName)),
    db.select({
      id: translationChapters.id,
      chapterNumber: translationChapters.chapterNumber,
      status: translationChapters.status,
      lockVersion: translationChapters.lockVersion,
      sourceTitle: translationSourceSnapshots.title,
      progressPercent: sql<number>`coalesce((select ji.progress_percent from translation_job_items ji join translation_jobs j on j.id = ji.job_id where ji.translation_chapter_id = ${translationChapters.id} order by j.created_at desc limit 1), 0)`.mapWith(Number),
      progressStage: sql<string>`coalesce((select ji.progress_stage from translation_job_items ji join translation_jobs j on j.id = ji.job_id where ji.translation_chapter_id = ${translationChapters.id} order by j.created_at desc limit 1), 'QUEUED')`,
      jobItemStatus: sql<string | null>`(select ji.status from translation_job_items ji join translation_jobs j on j.id = ji.job_id where ji.translation_chapter_id = ${translationChapters.id} order by j.created_at desc limit 1)`,
      revision: sql<number>`coalesce((select max(tv.revision) from translation_versions tv where tv.translation_chapter_id = ${translationChapters.id}), 0)`.mapWith(Number),
      criticalIssues: sql<number>`(select count(*) from translation_qa_issues qi where qi.translation_version_id = (select tv.id from translation_versions tv where tv.translation_chapter_id = ${translationChapters.id} order by tv.revision desc limit 1) and qi.severity = 'CRITICAL' and qi.resolved_at is null)`.mapWith(Number),
    }).from(translationChapters).innerJoin(translationSourceSnapshots, eq(translationSourceSnapshots.id, translationChapters.sourceSnapshotId))
      .where(eq(translationChapters.workspaceId, workspaceId)).orderBy(asc(translationChapters.chapterNumber)),
    db.select().from(translationJobs).where(eq(translationJobs.workspaceId, workspaceId)).orderBy(desc(translationJobs.createdAt)).limit(20),
    db.select().from(translationAiModels).where(eq(translationAiModels.isActive, true)).orderBy(asc(translationAiModels.name)),
    db.select().from(translationPromptVersions).where(eq(translationPromptVersions.isActive, true)).orderBy(desc(translationPromptVersions.createdAt)),
    db.select({ snapshot: translationProfileVersions.snapshot }).from(translationProfileVersions)
      .where(and(
        eq(translationProfileVersions.workspaceId, workspaceId),
        sql`${translationProfileVersions.snapshot} ? 'aiPipeline'`,
      )).orderBy(desc(translationProfileVersions.version)).limit(1),
    db.select({ after: adminAuditLogs.after }).from(adminAuditLogs).where(and(
      eq(adminAuditLogs.action, "translation.metadata.title_review"),
      eq(adminAuditLogs.entityType, "translation_workspace"),
      eq(adminAuditLogs.entityId, workspaceId),
    )).orderBy(desc(adminAuditLogs.createdAt)).limit(1),
    db.select({
      inputTokens: sql<number>`coalesce(sum(${translationAiInvocations.inputTokens}) filter (where ${translationAiInvocations.promptCacheEnabled}), 0)`.mapWith(Number),
      cachedInputTokens: sql<number>`coalesce(sum(${translationAiInvocations.cachedInputTokens}), 0)`.mapWith(Number),
      cacheWriteInputTokens: sql<number>`coalesce(sum(${translationAiInvocations.cacheWriteInputTokens}), 0)`.mapWith(Number),
      cacheEnabledRequests: sql<number>`count(*) filter (where ${translationAiInvocations.promptCacheEnabled})`.mapWith(Number),
    }).from(translationAiInvocations)
      .innerJoin(translationJobItems, eq(translationJobItems.id, translationAiInvocations.jobItemId))
      .innerJoin(translationJobs, eq(translationJobs.id, translationJobItems.jobId))
      .where(eq(translationJobs.workspaceId, workspaceId)),
  ]);
  const storedPipeline = profileVersions[0]?.snapshot && typeof profileVersions[0].snapshot === "object"
    ? storedAiPipelineSchema.safeParse(profileVersions[0].snapshot.aiPipeline)
    : null;
  const storedProfileAnalysis = profileVersions[0]?.snapshot && typeof profileVersions[0].snapshot === "object"
    ? storedProfileAnalysisSchema.safeParse(profileVersions[0].snapshot.analysis)
    : null;
  const storedTitleReview = storedTitleReviewSchema.safeParse(titleReviewRows[0]?.after);
  const aiUsage = aiUsageRows[0] ?? { inputTokens: 0, cachedInputTokens: 0, cacheWriteInputTokens: 0, cacheEnabledRequests: 0 };
  return {
    workspace: { ...serializeWorkspace(workspace.workspace), title: workspace.translatedTitle ?? workspace.sourceTitle ?? "Imported novel", updatedAt: workspace.workspace.updatedAt.toISOString() },
    source: {
      title: workspace.sourceTitle ?? "Imported novel",
      synopsis: workspace.sourceSynopsis,
      provider: workspace.provider,
      importReference: workspace.importReference,
    },
    translatedMetadata: workspace.translatedTitle ? {
      title: workspace.translatedTitle,
      synopsis: workspace.translatedSynopsis,
    } : null,
    profile: profile[0] ? { ...profile[0], updatedAt: profile[0].updatedAt.toISOString() } : null,
    profileAiPipeline: storedPipeline?.success ? storedPipeline.data : [],
    profileAnalysis: storedProfileAnalysis?.success ? storedProfileAnalysis.data : null,
    titleReview: storedTitleReview.success ? storedTitleReview.data : null,
    aiUsage: {
      ...aiUsage,
      cacheHitPercent: aiUsage.inputTokens > 0 ? Math.round((aiUsage.cachedInputTokens / aiUsage.inputTokens) * 1_000) / 10 : 0,
    },
    glossary: glossary.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    characters: characters.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    chapters: chapterRows,
    jobs: jobs.map((row) => ({ ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), startedAt: row.startedAt?.toISOString() ?? null, finishedAt: row.finishedAt?.toISOString() ?? null })),
    models: [selectBestTranslationModel(models, workspace.workspace.sourceLanguage, workspace.workspace.targetLanguage), ...models]
      .filter((row, index, rows): row is typeof models[number] => Boolean(row) && rows.findIndex((candidate) => candidate?.id === row?.id) === index)
      .map((row) => ({ id: row.id, name: row.name, provider: row.provider, modelName: row.modelName })),
    prompts: prompts.map((row) => ({ id: row.id, name: row.name, version: row.version })),
  };
}

export async function getActiveTranslationQueue() {
  await assertTranslationPermission("translation.view");
  const db = getDb();
  const jobs = await db.select({
    id: translationJobs.id,
    workspaceId: translationJobs.workspaceId,
    status: translationJobs.status,
    totalItems: translationJobs.totalItems,
    completedItems: translationJobs.completedItems,
    failedItems: translationJobs.failedItems,
    createdAt: translationJobs.createdAt,
    title: novelImportSourceTexts.title,
    progressPercent: sql<number>`coalesce((select round(avg(ji.progress_percent)) from translation_job_items ji where ji.job_id = ${translationJobs.id}), 0)`.mapWith(Number),
  }).from(translationJobs)
    .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationJobs.workspaceId))
    .innerJoin(novelImportSources, eq(novelImportSources.id, translationWorkspaces.importSourceId))
    .leftJoin(novelImportSourceTexts, and(
      eq(novelImportSourceTexts.sourceId, novelImportSources.id),
      eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage),
    ))
    .where(inArray(translationJobs.status, ["QUEUED", "RUNNING"]))
    .orderBy(asc(translationJobs.createdAt))
    .limit(5);

  if (!jobs.length) return { jobs: [] };
  const items = await db.select({
    jobId: translationJobItems.jobId,
    status: translationJobItems.status,
    progressPercent: translationJobItems.progressPercent,
    progressStage: translationJobItems.progressStage,
    chapterNumber: translationChapters.chapterNumber,
    title: translationSourceSnapshots.title,
  }).from(translationJobItems)
    .innerJoin(translationChapters, eq(translationChapters.id, translationJobItems.translationChapterId))
    .innerJoin(translationSourceSnapshots, eq(translationSourceSnapshots.id, translationJobItems.sourceSnapshotId))
    .where(and(
      inArray(translationJobItems.jobId, jobs.map((job) => job.id)),
      inArray(translationJobItems.status, ["QUEUED", "RUNNING"]),
    ))
    .orderBy(desc(translationJobItems.status), asc(translationChapters.chapterNumber));

  return {
    jobs: jobs.map((job) => ({
      ...job,
      title: job.title ?? "Imported novel",
      createdAt: job.createdAt.toISOString(),
      currentItem: items.find((item) => item.jobId === job.id && item.status === "RUNNING")
        ?? items.find((item) => item.jobId === job.id)
        ?? null,
    })),
  };
}

export async function reviewTranslationTitle(workspaceId: string, input: z.infer<typeof reviewTranslationTitleSchema>) {
  const actor = await assertTranslationPermission("translation.configure");
  if (!process.env.AI_TRANSLATION_API_KEY?.trim()) {
    throw new ApiError(409, "AI_CREDENTIAL_MISSING", "กรุณาตั้ง AI_TRANSLATION_API_KEY ใน environment ของ server");
  }
  await ensureAutomaticAiConfiguration(actor);
  const db = getDb();
  const [workspace] = await db.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new ApiError(404, "TRANSLATION_WORKSPACE_NOT_FOUND", "ไม่พบ Translation Workspace");
  const [sourceText, translatedText, profile, models] = await Promise.all([
    db.select().from(novelImportSourceTexts).where(and(
      eq(novelImportSourceTexts.sourceId, workspace.importSourceId),
      eq(novelImportSourceTexts.language, workspace.sourceLanguage),
    )).limit(1),
    db.select().from(novelImportSourceTexts).where(and(
      eq(novelImportSourceTexts.sourceId, workspace.importSourceId),
      eq(novelImportSourceTexts.language, workspace.targetLanguage),
    )).limit(1),
    db.select().from(translationProfiles).where(eq(translationProfiles.workspaceId, workspaceId)).limit(1),
    getAutomaticModels(["FOUNDATION"] as const),
  ]);
  if (!sourceText[0] || !translatedText[0]) throw new ApiError(409, "TRANSLATION_METADATA_MISSING", "ยังไม่มีชื่อเรื่องฉบับแปลให้ตรวจ");

  const review = await reviewNovelTitleWithAi({
    model: models.FOUNDATION,
    sourceTitle: sourceText[0].title,
    sourceSynopsis: sourceText[0].synopsis,
    translatedTitle: input.title,
    translatedSynopsis: input.synopsis,
    sourceLanguage: workspace.sourceLanguage,
    targetLanguage: workspace.targetLanguage,
    profile: profile[0] ? { styleGuide: profile[0].styleGuide, instructions: profile[0].instructions } : null,
  });
  const payload = {
    reviewedTitle: input.title,
    ...review.value,
    modelName: review.call.model.modelName,
    latencyMs: review.call.result.latencyMs,
    reviewedAt: new Date().toISOString(),
  };
  await db.transaction((tx) => writeAudit(tx, actor, "translation.metadata.title_review", "translation_workspace", workspaceId, {
    title: input.title,
  }, payload));
  return payload;
}

export async function configureTranslationWorkspace(workspaceId: string, input: z.infer<typeof configureTranslationWorkspaceSchema>) {
  const actor = await assertTranslationPermission("translation.configure");
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [before] = await tx.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, workspaceId)).limit(1);
    if (!before) throw new ApiError(404, "TRANSLATION_WORKSPACE_NOT_FOUND", "ไม่พบ Translation Workspace");
    const [activeJob] = await tx.select({ id: translationJobs.id }).from(translationJobs).where(and(
      eq(translationJobs.workspaceId, workspaceId),
      inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
    )).limit(1);
    if (activeJob) throw new ApiError(409, "TRANSLATION_JOB_ACTIVE", "รอให้งานแปลปัจจุบันเสร็จก่อนแก้ Profile เพื่อไม่ให้คำศัพท์ที่ AI เพิ่งพบสูญหาย");
    const [updated] = await tx.update(translationWorkspaces).set({
      status: "READY",
      version: before.version + 1,
      updatedAt: new Date(),
    }).where(and(eq(translationWorkspaces.id, workspaceId), eq(translationWorkspaces.version, input.expectedVersion))).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "การตั้งค่าถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดใหม่");

    await tx.update(translationProfiles).set({ ...input.profile, version: before.version + 1, updatedBy: actor.id, updatedAt: new Date() })
      .where(eq(translationProfiles.workspaceId, workspaceId));
    await tx.insert(novelImportSourceTexts).values({
      sourceId: before.importSourceId,
      language: before.targetLanguage,
      textKind: "translation",
      translationStatus: "approved",
      title: input.metadata.title,
      synopsis: input.metadata.synopsis,
    }).onConflictDoUpdate({
      target: [novelImportSourceTexts.sourceId, novelImportSourceTexts.language],
      set: { title: input.metadata.title, synopsis: input.metadata.synopsis, translationStatus: "approved", updatedAt: new Date() },
    });
    await tx.delete(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, workspaceId));
    if (input.glossary.length) await tx.insert(translationGlossaryEntries).values(input.glossary.map((entry) => ({ sourceTerm: entry.sourceTerm, targetTerm: entry.targetTerm, note: entry.note, isLocked: entry.isLocked, workspaceId, createdBy: actor.id })));
    await tx.delete(translationCharacters).where(eq(translationCharacters.workspaceId, workspaceId));
    if (input.characters.length) await tx.insert(translationCharacters).values(input.characters.map((character) => ({ sourceName: character.sourceName, targetName: character.targetName, aliases: character.aliases, description: character.description, speakingStyle: character.speakingStyle, isLocked: character.isLocked, workspaceId, createdBy: actor.id })));
    await tx.insert(translationProfileVersions).values({
      workspaceId,
      version: before.version + 1,
      snapshot: { profile: input.profile, metadata: input.metadata, glossary: input.glossary, characters: input.characters },
      createdBy: actor.id,
    });
    let novelSlug: string | null = null;
    if (before.novelId) {
      const [publicNovel] = await tx.update(novels).set({
        title: input.metadata.title,
        synopsis: input.metadata.synopsis ?? "",
        updatedBy: actor.id,
        updatedAt: new Date(),
      }).where(and(eq(novels.id, before.novelId), isNull(novels.deletedAt))).returning({ slug: novels.slug, titleOriginal: novels.titleOriginal });
      if (publicNovel) {
        novelSlug = publicNovel.slug;
        await tx.insert(novelSearchDocuments).values({
          novelId: before.novelId,
          searchText: [input.metadata.title, publicNovel.titleOriginal].filter(Boolean).join(" "),
        }).onConflictDoUpdate({
          target: novelSearchDocuments.novelId,
          set: { searchText: [input.metadata.title, publicNovel.titleOriginal].filter(Boolean).join(" "), updatedAt: new Date() },
        });
      }
    }
    await writeAudit(tx, actor, "translation.workspace.configure", "translation_workspace", workspaceId, serializeWorkspace(before), serializeWorkspace(updated));
    return { workspace: updated, novelSlug };
  });
  if (result.novelSlug) {
    await invalidateNovelCache(result.novelSlug);
    for (const tag of ["public-novels", "public-search", "public-rankings", "public-sitemap"]) revalidateTag(tag, { expire: 0 });
    revalidatePath("/");
    revalidatePath(`/novel/${result.novelSlug}`);
  }
  return result.workspace;
}

export async function createTranslationModel(input: z.infer<typeof createTranslationModelSchema>) {
  const actor = await assertTranslationPermission("translation.manage_models");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [versionRow] = await tx.select({ value: max(translationPromptVersions.version) }).from(translationPromptVersions).where(eq(translationPromptVersions.name, input.promptName));
    const promptVersion = Number(versionRow?.value ?? 0) + 1;
    const [model] = await tx.insert(translationAiModels).values({
      name: input.name, provider: input.provider, modelName: input.modelName, baseUrl: input.baseUrl.replace(/\/$/, ""), apiKeyEnv: input.apiKeyEnv,
      inputCostMicrosPerMillion: input.inputCostMicrosPerMillion, outputCostMicrosPerMillion: input.outputCostMicrosPerMillion,
      selectionPriority: input.selectionPriority, supportedLanguagePairs: input.supportedLanguagePairs, createdBy: actor.id,
    }).returning();
    const [prompt] = await tx.insert(translationPromptVersions).values({ name: input.promptName, version: promptVersion, systemPrompt: input.systemPrompt, createdBy: actor.id }).returning();
    await writeAudit(tx, actor, "translation.model.create", "translation_ai_model", model.id, null, { name: model.name, provider: model.provider, modelName: model.modelName, apiKeyEnv: model.apiKeyEnv, promptId: prompt.id });
    return { model, prompt };
  });
}

export async function enqueueTranslation(workspaceId: string, input: z.infer<typeof enqueueTranslationSchema>) {
  const actor = await assertTranslationPermission("translation.run");
  if (!input.modelId || !input.promptVersionId) {
    if (!process.env.AI_TRANSLATION_API_KEY?.trim()) throw new ApiError(409, "AI_CREDENTIAL_MISSING", "กรุณาตั้ง AI_TRANSLATION_API_KEY ใน environment ของ server");
    await ensureAutomaticAiConfiguration(actor);
  }
  const db = getDb();
  const uniqueChapterIds = [...new Set(input.chapterIds)];
  return db.transaction(async (tx) => {
    const [workspace] = await tx.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, workspaceId)).limit(1);
    if (!workspace) throw new ApiError(404, "TRANSLATION_WORKSPACE_NOT_FOUND", "ไม่พบ Translation Workspace");
    const [existing] = await tx.select().from(translationJobs).where(eq(translationJobs.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existing) return existing;
    const [profile] = await tx.select({ version: translationProfiles.version }).from(translationProfiles)
      .where(eq(translationProfiles.workspaceId, workspaceId)).limit(1);
    if (!profile || workspace.status === "SETUP") {
      throw new ApiError(409, "TRANSLATION_PROFILE_REVIEW_REQUIRED", "ยังไม่มี Translation Profile ที่พร้อมใช้ กรุณาสร้าง Profile ใหม่ก่อนเลือกตอนแปล");
    }
    const [activeJob] = await tx.select({ id: translationJobs.id }).from(translationJobs).where(and(
      eq(translationJobs.workspaceId, workspaceId),
      inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
    )).limit(1);
    if (activeJob) throw new ApiError(409, "TRANSLATION_JOB_ACTIVE", "มีงานแปลกำลังทำงานอยู่ กรุณารอให้งานปัจจุบันเสร็จก่อน");
    const activeModels = input.modelId ? [] : await tx.select().from(translationAiModels).where(eq(translationAiModels.isActive, true));
    const preferredModel = activeModels.find((candidate) => candidate.modelName === automaticModelNameForTask("MAIN_TRANSLATION"));
    const model = input.modelId
      ? (await tx.select().from(translationAiModels).where(and(eq(translationAiModels.id, input.modelId), eq(translationAiModels.isActive, true))).limit(1))[0]
      : selectBestTranslationModel(preferredModel ? [preferredModel] : activeModels, workspace.sourceLanguage, workspace.targetLanguage);
    const [prompt] = input.promptVersionId
      ? await tx.select({ id: translationPromptVersions.id }).from(translationPromptVersions).where(and(eq(translationPromptVersions.id, input.promptVersionId), eq(translationPromptVersions.isActive, true))).limit(1)
      : await tx.select({ id: translationPromptVersions.id }).from(translationPromptVersions).where(eq(translationPromptVersions.isActive, true)).orderBy(desc(translationPromptVersions.createdAt)).limit(1);
    if (!model || !prompt) throw new ApiError(400, "AI_CONFIG_UNAVAILABLE", "Model หรือ Prompt ไม่พร้อมใช้งาน");
    const selected = await tx.select({ id: translationChapters.id, sourceSnapshotId: translationChapters.sourceSnapshotId }).from(translationChapters).where(and(
      eq(translationChapters.workspaceId, workspaceId),
      inArray(translationChapters.id, uniqueChapterIds),
      inArray(translationChapters.status, ["READY", "STALE", "DRAFT", "QA_FAILED", "REVIEW", "APPROVED", "FAILED"]),
    )).for("update");
    if (selected.length !== uniqueChapterIds.length) throw new ApiError(400, "INVALID_CHAPTER_SELECTION", "รายการตอนมีตอนที่ไม่พร้อมแปล");
    const [job] = await tx.insert(translationJobs).values({ workspaceId, modelId: model.id, promptVersionId: prompt.id, idempotencyKey: input.idempotencyKey, requestedBy: actor.id, totalItems: selected.length }).returning();
    await tx.insert(translationJobItems).values(selected.map((chapter) => ({ jobId: job.id, translationChapterId: chapter.id, sourceSnapshotId: chapter.sourceSnapshotId })));
    await tx.update(translationChapters).set({ status: "QUEUED", updatedAt: new Date() }).where(inArray(translationChapters.id, selected.map((row) => row.id)));
    await tx.update(translationWorkspaces).set({ status: "TRANSLATING", updatedAt: new Date() }).where(eq(translationWorkspaces.id, workspaceId));
    await writeAudit(tx, actor, "translation.job.enqueue", "translation_job", job.id, null, { workspaceId, totalItems: selected.length, modelId: model.id, promptVersionId: prompt.id });
    return job;
  });
}

export async function cancelTranslationJob(jobId: string) {
  const actor = await assertTranslationPermission("translation.cancel_job");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(translationJobs).where(eq(translationJobs.id, jobId)).limit(1);
    if (!before) throw new ApiError(404, "TRANSLATION_JOB_NOT_FOUND", "ไม่พบงานแปล");
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(before.status)) return before;
    const now = new Date();
    const [updated] = await tx.update(translationJobs).set({ cancelRequestedAt: now, status: before.status === "QUEUED" ? "CANCELLED" : before.status, finishedAt: before.status === "QUEUED" ? now : null, updatedAt: now }).where(eq(translationJobs.id, jobId)).returning();
    const cancelledItems = await tx.update(translationJobItems).set({ status: "CANCELLED", progressPercent: 100, progressStage: "CANCELLED", finishedAt: now }).where(and(eq(translationJobItems.jobId, jobId), eq(translationJobItems.status, "QUEUED"))).returning({ chapterId: translationJobItems.translationChapterId });
    if (cancelledItems.length) await tx.update(translationChapters).set({ status: "READY", updatedAt: now }).where(and(inArray(translationChapters.id, cancelledItems.map((item) => item.chapterId)), eq(translationChapters.status, "QUEUED")));
    if (before.status === "QUEUED") await tx.update(translationWorkspaces).set({ status: "READY", updatedAt: now }).where(eq(translationWorkspaces.id, before.workspaceId));
    await writeAudit(tx, actor, "translation.job.cancel", "translation_job", jobId, { status: before.status }, { status: updated.status, cancelRequested: true });
    return updated;
  });
}

export async function getTranslationChapterEditor(workspaceId: string, chapterId: string) {
  await assertTranslationPermission("translation.view");
  const db = getDb();
  const [row] = await db.select({ chapter: translationChapters, source: translationSourceSnapshots, workspace: translationWorkspaces, profile: translationProfiles })
    .from(translationChapters)
    .innerJoin(translationSourceSnapshots, eq(translationSourceSnapshots.id, translationChapters.sourceSnapshotId))
    .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationChapters.workspaceId))
    .leftJoin(translationProfiles, eq(translationProfiles.workspaceId, translationWorkspaces.id))
    .where(and(eq(translationChapters.id, chapterId), eq(translationChapters.workspaceId, workspaceId))).limit(1);
  if (!row) return undefined;
  const [versions, glossary, characters] = await Promise.all([
    db.select().from(translationVersions).where(eq(translationVersions.translationChapterId, chapterId)).orderBy(desc(translationVersions.revision)),
    db.select().from(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, workspaceId)).orderBy(asc(translationGlossaryEntries.sourceTerm)),
    db.select().from(translationCharacters).where(eq(translationCharacters.workspaceId, workspaceId)).orderBy(asc(translationCharacters.sourceName)),
  ]);
  const latest = versions[0] ?? null;
  const issues = latest ? await db.select().from(translationQaIssues).where(eq(translationQaIssues.translationVersionId, latest.id)).orderBy(desc(translationQaIssues.severity)) : [];
  return {
    workspace: serializeWorkspace(row.workspace),
    chapter: { ...row.chapter, updatedAt: row.chapter.updatedAt.toISOString() },
    source: { id: row.source.id, title: row.source.title, content: row.source.content, hash: row.source.sourceHash, version: row.source.sourceVersion },
    profile: row.profile ? { name: row.profile.name, styleGuide: row.profile.styleGuide, instructions: row.profile.instructions, preserveParagraphs: row.profile.preserveParagraphs, version: row.profile.version } : null,
    latestVersion: latest ? { ...latest, approvedAt: latest.approvedAt?.toISOString() ?? null, publishedAt: latest.publishedAt?.toISOString() ?? null, createdAt: latest.createdAt.toISOString() } : null,
    history: versions.map((version) => ({ id: version.id, revision: version.revision, status: version.status, origin: version.origin, createdAt: version.createdAt.toISOString() })),
    glossary: glossary.map((entry) => ({ sourceTerm: entry.sourceTerm, targetTerm: entry.targetTerm, isLocked: entry.isLocked })),
    characters: characters.map((character) => ({ sourceName: character.sourceName, targetName: character.targetName, speakingStyle: character.speakingStyle, isLocked: character.isLocked })),
    issues: issues.map((issue) => ({ ...issue, createdAt: issue.createdAt.toISOString(), resolvedAt: issue.resolvedAt?.toISOString() ?? null })),
  };
}

export async function saveTranslationDraft(workspaceId: string, chapterId: string, input: z.infer<typeof saveTranslationSchema>) {
  const actor = await assertTranslationPermission("translation.edit");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [chapter] = await tx.select().from(translationChapters).where(and(eq(translationChapters.id, chapterId), eq(translationChapters.workspaceId, workspaceId))).limit(1);
    if (!chapter) throw new ApiError(404, "TRANSLATION_CHAPTER_NOT_FOUND", "ไม่พบตอนแปล");
    if (chapter.status === "QUEUED" || chapter.status === "TRANSLATING") throw new ApiError(409, "TRANSLATION_IN_PROGRESS", "ตอนนี้กำลังอยู่ในคิวแปล กรุณารอให้งานจบหรือยกเลิกงานก่อน");
    if (input.parentVersionId) {
      const [parent] = await tx.select({ id: translationVersions.id }).from(translationVersions).where(and(eq(translationVersions.id, input.parentVersionId), eq(translationVersions.translationChapterId, chapter.id))).limit(1);
      if (!parent) throw new ApiError(400, "INVALID_PARENT_VERSION", "Parent revision ไม่ได้อยู่ในตอนนี้");
    }
    const [locked] = await tx.update(translationChapters).set({ status: "DRAFT", lockVersion: chapter.lockVersion + 1, updatedAt: new Date() })
      .where(and(eq(translationChapters.id, chapter.id), eq(translationChapters.lockVersion, input.expectedLockVersion))).returning();
    if (!locked) throw new ApiError(409, "VERSION_CONFLICT", "คำแปลถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดใหม่");
    const [source] = await tx.select().from(translationSourceSnapshots).where(eq(translationSourceSnapshots.id, chapter.sourceSnapshotId)).limit(1);
    const version = await insertTranslationVersion(tx, { chapter, title: input.title, content: input.content, origin: "MANUAL", parentVersionId: input.parentVersionId, actorId: actor.id });
    const issues = await replaceQaIssues(tx, version.id, source.content, input.content, workspaceId);
    const status = issues.some((issue) => issue.severity === "CRITICAL") ? "QA_FAILED" : "REVIEW";
    await tx.update(translationChapters).set({ status, updatedAt: new Date() }).where(eq(translationChapters.id, chapter.id));
    await writeAudit(tx, actor, "translation.version.create", "translation_version", version.id, null, { chapterId, revision: version.revision, origin: version.origin, titleLength: version.title.length, contentLength: version.content.length, qaIssues: issues.length });
    return { version, lockVersion: locked.lockVersion, status, issues };
  });
}

type TranslationPublicRow = {
  workspace: typeof translationWorkspaces.$inferSelect;
  translationChapter: typeof translationChapters.$inferSelect;
  version: typeof translationVersions.$inferSelect;
  novel: typeof novels.$inferSelect | null;
};

type TranslationTx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function syncPublicNovelStatistics(tx: TranslationTx, novelId: string, now: Date) {
  // Publishing and approval can run in parallel for different translated
  // chapters. Serialize their aggregate updates so a slower transaction cannot
  // overwrite the latest chapter/counts calculated by a newer transaction.
  const [lockedNovel] = await tx.select({ id: novels.id }).from(novels)
    .where(eq(novels.id, novelId)).for("no key update").limit(1);
  if (!lockedNovel) throw new ApiError(409, "PUBLIC_NOVEL_MISSING", "ไม่พบนิยายฉบับร่างสำหรับเผยแพร่");

  const [chapterCounts] = await tx.select({
    total: sql<number>`count(*) filter (where ${chapters.deletedAt} is null)::int`.mapWith(Number),
    published: sql<number>`count(*) filter (where ${chapters.deletedAt} is null and ${chapters.status} = 'PUBLISHED')::int`.mapWith(Number),
  }).from(chapters).where(eq(chapters.novelId, novelId));
  const [latestPublicChapter] = await tx.select({ id: chapters.id, publishedAt: chapters.publishedAt }).from(chapters)
    .where(and(eq(chapters.novelId, novelId), eq(chapters.status, "PUBLISHED"), isNull(chapters.deletedAt)))
    .orderBy(desc(chapters.sortOrder), desc(chapters.id)).limit(1);
  const statistics = {
    latestChapterId: latestPublicChapter?.id ?? null,
    totalChapters: Number(chapterCounts?.total ?? 0),
    publishedChapters: Number(chapterCounts?.published ?? 0),
    latestChapterAt: latestPublicChapter?.publishedAt ?? null,
    updatedAt: now,
  };
  await tx.insert(novelStatistics).values({ novelId, ...statistics })
    .onConflictDoUpdate({ target: novelStatistics.novelId, set: statistics });
  await tx.update(novels).set({ latestChapterAt: statistics.latestChapterAt, updatedAt: now }).where(eq(novels.id, novelId));
}

/** Ensures approved translation text exists as a non-public catalog draft. */
async function stageApprovedTranslationDraft(tx: TranslationTx, row: TranslationPublicRow, actor: CurrentUser, now: Date) {
  const [source] = await tx.select().from(novelImportSources)
    .where(eq(novelImportSources.id, row.workspace.importSourceId)).limit(1).for("update");
  if (!source) throw new ApiError(409, "IMPORT_SOURCE_MISSING", "ไม่พบข้อมูล Import สำหรับสร้างนิยายฉบับร่าง");
  const textRows = await tx.select().from(novelImportSourceTexts).where(eq(novelImportSourceTexts.sourceId, source.id));
  const sourceText = textRows.find((text) => text.language.toLowerCase() === row.workspace.sourceLanguage.toLowerCase());
  const targetText = textRows.find((text) => text.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase());
  if (!sourceText) throw new ApiError(409, "IMPORT_METADATA_MISSING", "ไม่พบชื่อเรื่องต้นฉบับสำหรับสร้างนิยายฉบับร่าง");
  const localizedTitle = targetText?.title.trim() || sourceText.title;
  const localizedSynopsis = targetText?.synopsis?.trim() || sourceText.synopsis?.trim() || `Translated edition of ${sourceText.title}`;

  const linkedLanguageMatches = row.novel?.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase();
  let publicNovelId = linkedLanguageMatches ? row.workspace.novelId : null;
  let publicNovel = linkedLanguageMatches ? row.novel : null;
  if (!publicNovelId || !publicNovel) {
    if (source.linkedNovelId) {
      const [linkedNovel] = await tx.select().from(novels).where(and(eq(novels.id, source.linkedNovelId), isNull(novels.deletedAt))).limit(1);
      if (linkedNovel?.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase()) {
        publicNovelId = linkedNovel.id;
        publicNovel = linkedNovel;
      }
    }
    if (!publicNovelId || !publicNovel) {
      if (row.workspace.sourceLanguage.length > 16 || row.workspace.targetLanguage.length > 16) {
        throw new ApiError(409, "PUBLIC_LANGUAGE_UNSUPPORTED", "รหัสภาษายาวเกินกว่าที่นิยายสาธารณะรองรับ");
      }
      const publicSlug = await createUniqueSlug(
        selectReadableSlugSource(localizedTitle, sourceText.title),
        async (candidate) => {
          const [existing] = await tx.select({ id: novels.id }).from(novels).where(eq(novels.slug, candidate)).limit(1);
          return Boolean(existing);
        },
        "novel",
      );
      const [createdNovel] = await tx.insert(novels).values({
        slug: publicSlug,
        title: localizedTitle,
        titleOriginal: sourceText.title,
        synopsis: localizedSynopsis,
        synopsisOriginal: sourceText.synopsis,
        coverKey: source.coverKey,
        originalLanguage: row.workspace.sourceLanguage,
        language: row.workspace.targetLanguage,
        status: "ONGOING",
        publicationStatus: "DRAFT",
        originType: "licensed_translation",
        contentPolicyConfirmedAt: now,
        createdBy: actor.id,
        updatedBy: actor.id,
      }).returning();
      publicNovelId = createdNovel.id;
      publicNovel = createdNovel;
      await tx.insert(novelStatistics).values({ novelId: createdNovel.id });
      await tx.insert(novelSearchDocuments).values({ novelId: createdNovel.id, searchText: [createdNovel.title, createdNovel.titleOriginal].filter(Boolean).join(" ") });
      await writeAudit(tx, actor, "translation.public_novel.stage", "novel", createdNovel.id, null, { importSourceId: source.id, publicationStatus: "DRAFT" });
    }
    await tx.update(translationWorkspaces).set({ novelId: publicNovelId, version: sql`${translationWorkspaces.version} + 1`, updatedAt: now }).where(eq(translationWorkspaces.id, row.workspace.id));
    await tx.update(novelImportSources).set({ linkedNovelId: publicNovelId, updatedAt: now }).where(and(eq(novelImportSources.id, row.workspace.importSourceId), isNull(novelImportSources.linkedNovelId)));
  }

  // The profile creation step owns translated story metadata. Keep an already
  // staged (or already published) catalog novel synchronized when the profile
  // is regenerated or metadata is backfilled later.
  await tx.update(novels).set({
    title: localizedTitle,
    titleOriginal: sourceText.title,
    synopsis: localizedSynopsis,
    synopsisOriginal: sourceText.synopsis,
    coverKey: source.coverKey ?? publicNovel.coverKey,
    updatedBy: actor.id,
    updatedAt: now,
  }).where(eq(novels.id, publicNovelId));
  await tx.insert(novelSearchDocuments).values({
    novelId: publicNovelId,
    searchText: [localizedTitle, sourceText.title].filter(Boolean).join(" "),
  }).onConflictDoUpdate({
    target: novelSearchDocuments.novelId,
    set: { searchText: [localizedTitle, sourceText.title].filter(Boolean).join(" "), updatedAt: now },
  });

  let publicChapterId = row.translationChapter.linkedChapterId;
  if (publicChapterId) {
    const [linkedChapter] = await tx.select({ id: chapters.id, status: chapters.status }).from(chapters)
      .where(and(eq(chapters.id, publicChapterId), eq(chapters.novelId, publicNovelId), isNull(chapters.deletedAt))).limit(1);
    if (!linkedChapter) publicChapterId = null;
    else if (linkedChapter.status !== "PUBLISHED") {
      await tx.update(chapters).set({ title: row.version.title, content: row.version.content, wordCount: countWords(row.version.content), status: "DRAFT", publishedAt: null, scheduledFor: null, version: sql`${chapters.version} + 1`, updatedBy: actor.id, updatedAt: now }).where(eq(chapters.id, linkedChapter.id));
    }
  }
  if (!publicChapterId) {
    const [maxSort] = await tx.select({ value: max(chapters.sortOrder) }).from(chapters).where(eq(chapters.novelId, publicNovelId));
    const [createdChapter] = await tx.insert(chapters).values({
      novelId: publicNovelId,
      chapterNumber: row.translationChapter.chapterNumber,
      sortOrder: Number(maxSort?.value ?? 0) + 1,
      slug: `chapter-${row.translationChapter.chapterNumber}`,
      title: row.version.title,
      content: row.version.content,
      wordCount: countWords(row.version.content),
      status: "DRAFT",
      createdBy: actor.id,
      updatedBy: actor.id,
    }).returning({ id: chapters.id });
    publicChapterId = createdChapter.id;
    await tx.update(translationChapters).set({ linkedChapterId: createdChapter.id }).where(eq(translationChapters.id, row.translationChapter.id));
    await tx.update(novelImportChapters).set({ linkedChapterId: createdChapter.id, updatedAt: now }).where(and(eq(novelImportChapters.id, row.translationChapter.importChapterId), isNull(novelImportChapters.linkedChapterId)));
  }
  await syncPublicNovelStatistics(tx, publicNovelId, now);
  return { publicNovelId, publicChapterId };
}

export async function approveTranslationVersion(workspaceId: string, chapterId: string, versionId: string) {
  const actor = await assertTranslationPermission("translation.approve");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ version: translationVersions, chapter: translationChapters, workspace: translationWorkspaces, novel: novels })
      .from(translationVersions)
      .innerJoin(translationChapters, eq(translationChapters.id, translationVersions.translationChapterId))
      .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationChapters.workspaceId))
      .leftJoin(novels, eq(novels.id, translationWorkspaces.novelId))
      .where(and(eq(translationVersions.id, versionId), eq(translationChapters.id, chapterId), eq(translationChapters.workspaceId, workspaceId))).limit(1);
    if (!row) throw new ApiError(404, "TRANSLATION_VERSION_NOT_FOUND", "ไม่พบเวอร์ชันคำแปล");
    if (row.chapter.status === "STALE") throw new ApiError(409, "SOURCE_CHANGED", "ต้นฉบับเปลี่ยนหลังจากสร้างคำแปล กรุณาสร้าง revision ใหม่จากต้นฉบับล่าสุด");
    const [latestRevision] = await tx.select({ value: max(translationVersions.revision) }).from(translationVersions).where(eq(translationVersions.translationChapterId, chapterId));
    if (row.version.revision !== Number(latestRevision?.value ?? 0)) throw new ApiError(409, "LATEST_REVISION_REQUIRED", "อนุมัติได้เฉพาะ revision ล่าสุด");
    const [critical] = await tx.select({ value: count() }).from(translationQaIssues).where(and(eq(translationQaIssues.translationVersionId, versionId), eq(translationQaIssues.severity, "CRITICAL"), isNull(translationQaIssues.resolvedAt)));
    if (Number(critical?.value ?? 0) > 0) throw new ApiError(409, "QA_BLOCKING", "ยังมีปัญหา QA ระดับ Critical ที่ต้องแก้ไข");
    const now = new Date();
    await tx.update(translationVersions).set({ status: "SUPERSEDED" }).where(and(eq(translationVersions.translationChapterId, chapterId), eq(translationVersions.status, "APPROVED"), ne(translationVersions.id, versionId)));
    const [approved] = await tx.update(translationVersions).set({ status: "APPROVED", approvedBy: actor.id, approvedAt: now }).where(eq(translationVersions.id, versionId)).returning();
    await tx.update(translationChapters).set({ status: "APPROVED", updatedAt: now }).where(eq(translationChapters.id, chapterId));
    const draft = await stageApprovedTranslationDraft(tx, { workspace: row.workspace, translationChapter: row.chapter, version: approved, novel: row.novel }, actor, now);
    await writeAudit(tx, actor, "translation.version.approve", "translation_version", versionId, { status: row.version.status }, { status: "APPROVED", chapterId, publicChapterId: draft.publicChapterId, publicStatus: "DRAFT" });
    return approved;
  });
}

export async function publishTranslationVersion(workspaceId: string, chapterId: string, versionId: string) {
  const actor = await assertTranslationPermission("translation.publish");
  const db = getDb();
  const result = await db.transaction(async (tx) => {
    const [row] = await tx.select({ workspace: translationWorkspaces, translationChapter: translationChapters, version: translationVersions, novel: novels })
      .from(translationVersions)
      .innerJoin(translationChapters, eq(translationChapters.id, translationVersions.translationChapterId))
      .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationChapters.workspaceId))
      .leftJoin(novels, eq(novels.id, translationWorkspaces.novelId))
      .where(and(eq(translationVersions.id, versionId), eq(translationChapters.id, chapterId), eq(translationWorkspaces.id, workspaceId))).limit(1);
    if (!row) throw new ApiError(404, "TRANSLATION_VERSION_NOT_FOUND", "ไม่พบเวอร์ชันคำแปล");
    if (row.version.status !== "APPROVED" && row.version.status !== "PUBLISHED") {
      throw new ApiError(409, "APPROVAL_REQUIRED", "เผยแพร่ได้เฉพาะเวอร์ชันที่อนุมัติแล้ว");
    }
    if (row.translationChapter.status !== "APPROVED" && row.translationChapter.status !== "PUBLISHED") {
      throw new ApiError(409, "CURRENT_APPROVAL_REQUIRED", "สถานะตอนเปลี่ยนหลังการอนุมัติ กรุณาตรวจและอนุมัติ revision ล่าสุดอีกครั้ง");
    }
    const now = new Date();
    const { publicNovelId, publicChapterId } = await stageApprovedTranslationDraft(tx, row, actor, now);
    const [publicNovel] = await tx.select({ slug: novels.slug, publishedAt: novels.publishedAt })
      .from(novels).where(and(eq(novels.id, publicNovelId), isNull(novels.deletedAt))).limit(1);
    if (!publicNovel) throw new ApiError(409, "PUBLIC_NOVEL_MISSING", "ไม่พบนิยายฉบับร่างสำหรับเผยแพร่");

    const [publishedChapter] = await tx.update(chapters).set({
      title: row.version.title,
      content: row.version.content,
      wordCount: countWords(row.version.content),
      status: "PUBLISHED",
      publishedAt: now,
      scheduledFor: null,
      version: sql`${chapters.version} + 1`,
      updatedBy: actor.id,
      updatedAt: now,
    }).where(and(eq(chapters.id, publicChapterId), eq(chapters.novelId, publicNovelId), inArray(chapters.status, ["DRAFT", "PUBLISHED"]))).returning({ id: chapters.id });
    if (!publishedChapter) throw new ApiError(409, "PUBLIC_DRAFT_REQUIRED", "ไม่พบตอนฉบับร่างสำหรับเผยแพร่");
    // Do not interpolate Date inside a raw sql fragment here. That bypasses
    // Drizzle's timestamp encoder and postgres-js receives a Date where it
    // expects a string. A regular mapped value is encoded correctly.
    const [publishedNovel] = await tx.update(novels).set({
      publicationStatus: "PUBLISHED",
      publishedAt: publicNovel.publishedAt ?? now,
      updatedBy: actor.id,
      updatedAt: now,
    }).where(and(eq(novels.id, publicNovelId), isNull(novels.deletedAt))).returning({ id: novels.id });
    if (!publishedNovel) throw new ApiError(409, "PUBLIC_NOVEL_MISSING", "ไม่พบนิยายฉบับร่างสำหรับเผยแพร่");
    await tx.update(translationVersions).set({ status: "PUBLISHED", publishedAt: row.version.publishedAt ?? now }).where(eq(translationVersions.id, versionId));
    await tx.update(translationChapters).set({ status: "PUBLISHED", updatedAt: now }).where(eq(translationChapters.id, chapterId));
    await syncPublicNovelStatistics(tx, publicNovelId, now);
    await tx.insert(domainOutboxEvents).values({ type: "chapter_published", aggregateType: "chapter", aggregateId: publicChapterId!, dedupeKey: `translation-published:${versionId}`, payload: { chapterId: publicChapterId, novelId: publicNovelId, translationVersionId: versionId } }).onConflictDoNothing();
    if (row.version.status !== "PUBLISHED") {
      await writeAudit(tx, actor, "translation.version.publish", "translation_version", versionId, { status: "APPROVED" }, { status: "PUBLISHED", publicChapterId });
    }
    return { versionId, publicChapterId, publicNovelId, novelSlug: publicNovel.slug };
  });

  // Database commit happens before cache invalidation. If cache invalidation
  // ever fails, the endpoint can safely be retried because publishing above is
  // idempotent for an already-published version.
  await invalidateChapterCache(result.novelSlug);
  for (const tag of ["public-novels", "public-chapters", "public-search", "public-rankings", "public-sitemap"]) {
    revalidateTag(tag, { expire: 0 });
  }
  revalidatePath("/");
  revalidatePath(`/novel/${result.novelSlug}`);
  revalidatePath(`/novel/${result.novelSlug}/chapters`);

  return result;
}
