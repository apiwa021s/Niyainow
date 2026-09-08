import "server-only";

import { and, asc, count, desc, eq, inArray, isNull, max, ne, sql } from "drizzle-orm";
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
} from "@/lib/domain/translation-ai-routing";
import { countWords, segmentText, selectBestTranslationModel } from "@/lib/domain/translation";
import { buildDefaultTranslationProfile } from "@/lib/domain/translation-profile";
import { ApiError } from "@/lib/http/api-response";
import { insertTranslationVersion, replaceQaIssues } from "@/services/translation-version-service";

const languageSchema = z.string().trim().regex(/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/).max(35);
const uuidSchema = z.uuid();

export const createTranslationWorkspaceSchema = z.object({
  importSourceId: uuidSchema,
  targetLanguage: languageSchema,
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
  profile: z.object({
    name: z.string().trim().min(1).max(160),
    styleGuide: z.string().trim().max(20_000),
    instructions: z.string().trim().max(20_000),
    preserveParagraphs: z.boolean(),
  }),
  glossary: z.array(glossaryEntrySchema).max(2_000),
  characters: z.array(characterSchema).max(1_000),
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

function createImportedNovelSlug(provider: string, externalWorkId: string, targetLanguage: string, sourceId: string) {
  const identity = `${provider}-${externalWorkId}-${targetLanguage}`.toLowerCase().normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 145);
  return `import-${identity || "novel"}-${sourceId.slice(0, 8)}`;
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

function defaultProfileValues(input: { title: string; synopsis: string | null; sourceLanguage: string; targetLanguage: string }) {
  const analyzed = buildDefaultTranslationProfile(input);
  return {
    name: analyzed.name,
    styleGuide: analyzed.styleGuide,
    instructions: analyzed.instructions,
    preserveParagraphs: analyzed.preserveParagraphs,
  };
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

export async function createTranslationWorkspace(input: z.infer<typeof createTranslationWorkspaceSchema>) {
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
  const createdWorkspace = await db.transaction(async (tx) => {
    const [created] = await tx.insert(translationWorkspaces).values({
      importSourceId: source.id,
      novelId: null,
      sourceLanguage: source.sourceLanguage,
      targetLanguage: input.targetLanguage,
      createdBy: actor.id,
      assignedEditorId: actor.id,
    }).onConflictDoNothing({
      target: [translationWorkspaces.importSourceId, translationWorkspaces.targetLanguage],
    }).returning();
    if (!created) return null;
    const profile = defaultProfileValues({
      title: sourceText.title,
      synopsis: sourceText.synopsis,
      sourceLanguage: source.sourceLanguage,
      targetLanguage: input.targetLanguage,
    });
    await tx.insert(translationProfiles).values({ workspaceId: created.id, ...profile, updatedBy: actor.id });
    await tx.insert(translationProfileVersions).values({ workspaceId: created.id, version: 1, snapshot: { profile, glossary: [], characters: [] }, createdBy: actor.id });
    await writeAudit(tx, actor, "translation.workspace.create", "translation_workspace", created.id, null, serializeWorkspace(created));
    return created;
  });
  let workspace = createdWorkspace ?? (await db.select().from(translationWorkspaces).where(and(
    eq(translationWorkspaces.importSourceId, source.id),
    eq(translationWorkspaces.targetLanguage, input.targetLanguage),
  )).limit(1))[0];
  if (!workspace) throw new ApiError(409, "TRANSLATION_WORKSPACE_CONFLICT", "ไม่สามารถเปิดงานแปลเดิมได้ กรุณาลองใหม่อีกครั้ง");

  if (!createdWorkspace) {
    const preparedWorkspace = await db.transaction(async (tx) => {
      const [currentWorkspace] = await tx.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, workspace.id)).limit(1).for("update");
      const [currentProfile] = await tx.select().from(translationProfiles).where(eq(translationProfiles.workspaceId, workspace.id)).limit(1).for("update");
      if (!currentWorkspace || !currentProfile || currentProfile.version > 1 || currentProfile.name !== "Default") return null;
      const profile = defaultProfileValues({
        title: sourceText.title,
        synopsis: sourceText.synopsis,
        sourceLanguage: source.sourceLanguage,
        targetLanguage: input.targetLanguage,
      });
      const nextVersion = currentWorkspace.version + 1;
      const [updated] = await tx.update(translationWorkspaces).set({ status: "SETUP", version: nextVersion, updatedAt: new Date() })
        .where(eq(translationWorkspaces.id, currentWorkspace.id)).returning();
      await tx.update(translationProfiles).set({ ...profile, version: nextVersion, updatedBy: actor.id, updatedAt: new Date() })
        .where(eq(translationProfiles.workspaceId, currentWorkspace.id));
      await tx.insert(translationProfileVersions).values({
        workspaceId: currentWorkspace.id,
        version: nextVersion,
        snapshot: { profile, glossary: [], characters: [], source: { title: sourceText.title, synopsis: sourceText.synopsis } },
        createdBy: actor.id,
      }).onConflictDoNothing();
      await writeAudit(tx, actor, "translation.profile.bootstrap", "translation_workspace", currentWorkspace.id, serializeWorkspace(currentWorkspace), serializeWorkspace(updated));
      return updated;
    });
    if (preparedWorkspace) workspace = preparedWorkspace;
  }

  await syncTranslationWorkspaceSources(workspace.id);
  return workspace;
}

export async function getTranslationStudio() {
  const actor = await assertTranslationPermission("translation.view");
  await ensureAutomaticAiConfiguration(actor);
  const db = getDb();
  const [workspaceRows, sourceRows, modelRows, promptRows] = await Promise.all([
    db.select({
      workspace: translationWorkspaces,
      sourceTitle: novelImportSourceTexts.title,
      chapterCount: sql<number>`(select count(*) from translation_chapters tc where tc.workspace_id = ${translationWorkspaces.id})`.mapWith(Number),
      approvedCount: sql<number>`(select count(*) from translation_chapters tc where tc.workspace_id = ${translationWorkspaces.id} and tc.status in ('APPROVED','PUBLISHED'))`.mapWith(Number),
      jobCostMicros: sql<number>`coalesce((select sum(ai.cost_micros) from translation_ai_invocations ai join translation_job_items ji on ji.id = ai.job_item_id join translation_jobs j on j.id = ji.job_id where j.workspace_id = ${translationWorkspaces.id}), 0)`.mapWith(Number),
    }).from(translationWorkspaces)
      .innerJoin(novelImportSources, eq(novelImportSources.id, translationWorkspaces.importSourceId))
      .leftJoin(novelImportSourceTexts, and(eq(novelImportSourceTexts.sourceId, novelImportSources.id), eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage)))
      .orderBy(desc(translationWorkspaces.updatedAt)),
    db.select({
      id: novelImportSources.id,
      sourceLanguage: novelImportSources.sourceLanguage,
      title: novelImportSourceTexts.title,
      synopsis: novelImportSourceTexts.synopsis,
      chapterCount: sql<number>`(select count(*) from novel_import_chapters nic where nic.source_id = ${novelImportSources.id})`.mapWith(Number),
    })
      .from(novelImportSources)
      .leftJoin(novelImportSourceTexts, and(eq(novelImportSourceTexts.sourceId, novelImportSources.id), eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage)))
      .where(eq(novelImportSources.status, "ready")).orderBy(desc(novelImportSources.updatedAt)),
    db.select().from(translationAiModels).where(eq(translationAiModels.isActive, true)).orderBy(asc(translationAiModels.name)),
    db.select().from(translationPromptVersions).where(eq(translationPromptVersions.isActive, true)).orderBy(desc(translationPromptVersions.createdAt)),
  ]);
  return {
    workspaces: workspaceRows.map(({ workspace, sourceTitle, chapterCount, approvedCount, jobCostMicros }) => ({
      ...serializeWorkspace(workspace), title: sourceTitle ?? "Imported novel", chapterCount, approvedCount, jobCostMicros, updatedAt: workspace.updatedAt.toISOString(),
    })),
    sources: sourceRows.map((row) => ({ ...row, title: row.title ?? "Imported novel" })),
    models: modelRows.map((row) => ({ ...row, inputCostMicrosPerMillion: Number(row.inputCostMicrosPerMillion), outputCostMicrosPerMillion: Number(row.outputCostMicrosPerMillion), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() })),
    prompts: promptRows.map((row) => ({ id: row.id, name: row.name, version: row.version })),
  };
}

export async function getTranslationWorkspace(workspaceId: string) {
  await assertTranslationPermission("translation.view");
  if (!uuidSchema.safeParse(workspaceId).success) return undefined;
  const db = getDb();
  const [workspace] = await db.select({
    workspace: translationWorkspaces,
    title: novelImportSourceTexts.title,
    synopsis: novelImportSourceTexts.synopsis,
    provider: novelImportSources.provider,
    importReference: novelImportSources.importReference,
  }).from(translationWorkspaces)
    .innerJoin(novelImportSources, eq(novelImportSources.id, translationWorkspaces.importSourceId))
    .leftJoin(novelImportSourceTexts, and(eq(novelImportSourceTexts.sourceId, novelImportSources.id), eq(novelImportSourceTexts.language, novelImportSources.sourceLanguage)))
    .where(eq(translationWorkspaces.id, workspaceId)).limit(1);
  if (!workspace) return undefined;
  const [profile, glossary, characters, chapterRows, jobs, models, prompts] = await Promise.all([
    db.select().from(translationProfiles).where(eq(translationProfiles.workspaceId, workspaceId)).limit(1),
    db.select().from(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, workspaceId)).orderBy(asc(translationGlossaryEntries.sourceTerm)),
    db.select().from(translationCharacters).where(eq(translationCharacters.workspaceId, workspaceId)).orderBy(asc(translationCharacters.sourceName)),
    db.select({
      id: translationChapters.id,
      chapterNumber: translationChapters.chapterNumber,
      status: translationChapters.status,
      lockVersion: translationChapters.lockVersion,
      sourceTitle: translationSourceSnapshots.title,
      revision: sql<number>`coalesce((select max(tv.revision) from translation_versions tv where tv.translation_chapter_id = ${translationChapters.id}), 0)`.mapWith(Number),
      criticalIssues: sql<number>`(select count(*) from translation_qa_issues qi where qi.translation_version_id = (select tv.id from translation_versions tv where tv.translation_chapter_id = ${translationChapters.id} order by tv.revision desc limit 1) and qi.severity = 'CRITICAL' and qi.resolved_at is null)`.mapWith(Number),
    }).from(translationChapters).innerJoin(translationSourceSnapshots, eq(translationSourceSnapshots.id, translationChapters.sourceSnapshotId))
      .where(eq(translationChapters.workspaceId, workspaceId)).orderBy(asc(translationChapters.chapterNumber)),
    db.select().from(translationJobs).where(eq(translationJobs.workspaceId, workspaceId)).orderBy(desc(translationJobs.createdAt)).limit(20),
    db.select().from(translationAiModels).where(eq(translationAiModels.isActive, true)).orderBy(asc(translationAiModels.name)),
    db.select().from(translationPromptVersions).where(eq(translationPromptVersions.isActive, true)).orderBy(desc(translationPromptVersions.createdAt)),
  ]);
  return {
    workspace: { ...serializeWorkspace(workspace.workspace), title: workspace.title ?? "Imported novel", updatedAt: workspace.workspace.updatedAt.toISOString() },
    source: {
      title: workspace.title ?? "Imported novel",
      synopsis: workspace.synopsis,
      provider: workspace.provider,
      importReference: workspace.importReference,
    },
    profile: profile[0] ? { ...profile[0], updatedAt: profile[0].updatedAt.toISOString() } : null,
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

export async function configureTranslationWorkspace(workspaceId: string, input: z.infer<typeof configureTranslationWorkspaceSchema>) {
  const actor = await assertTranslationPermission("translation.configure");
  const db = getDb();
  return db.transaction(async (tx) => {
    const [before] = await tx.select().from(translationWorkspaces).where(eq(translationWorkspaces.id, workspaceId)).limit(1);
    if (!before) throw new ApiError(404, "TRANSLATION_WORKSPACE_NOT_FOUND", "ไม่พบ Translation Workspace");
    const [activeJob] = await tx.select({ id: translationJobs.id }).from(translationJobs).where(and(
      eq(translationJobs.workspaceId, workspaceId),
      inArray(translationJobs.status, ["QUEUED", "RUNNING"]),
    )).limit(1);
    const [updated] = await tx.update(translationWorkspaces).set({
      status: activeJob ? "TRANSLATING" : "READY",
      version: before.version + 1,
      updatedAt: new Date(),
    }).where(and(eq(translationWorkspaces.id, workspaceId), eq(translationWorkspaces.version, input.expectedVersion))).returning();
    if (!updated) throw new ApiError(409, "VERSION_CONFLICT", "การตั้งค่าถูกแก้ไขจากหน้าต่างอื่น กรุณาโหลดใหม่");

    await tx.update(translationProfiles).set({ ...input.profile, version: before.version + 1, updatedBy: actor.id, updatedAt: new Date() })
      .where(eq(translationProfiles.workspaceId, workspaceId));
    await tx.delete(translationGlossaryEntries).where(eq(translationGlossaryEntries.workspaceId, workspaceId));
    if (input.glossary.length) await tx.insert(translationGlossaryEntries).values(input.glossary.map((entry) => ({ sourceTerm: entry.sourceTerm, targetTerm: entry.targetTerm, note: entry.note, isLocked: entry.isLocked, workspaceId, createdBy: actor.id })));
    await tx.delete(translationCharacters).where(eq(translationCharacters.workspaceId, workspaceId));
    if (input.characters.length) await tx.insert(translationCharacters).values(input.characters.map((character) => ({ sourceName: character.sourceName, targetName: character.targetName, aliases: character.aliases, description: character.description, speakingStyle: character.speakingStyle, isLocked: character.isLocked, workspaceId, createdBy: actor.id })));
    await tx.insert(translationProfileVersions).values({
      workspaceId,
      version: before.version + 1,
      snapshot: { profile: input.profile, glossary: input.glossary, characters: input.characters },
      createdBy: actor.id,
    });
    await writeAudit(tx, actor, "translation.workspace.configure", "translation_workspace", workspaceId, serializeWorkspace(before), serializeWorkspace(updated));
    return updated;
  });
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
    if (!profile || workspace.status === "SETUP" || profile.version <= 1) {
      throw new ApiError(409, "TRANSLATION_PROFILE_REVIEW_REQUIRED", "กรุณาตรวจและบันทึก Default Profile ก่อนเลือกตอนเริ่มแปล");
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
    const cancelledItems = await tx.update(translationJobItems).set({ status: "CANCELLED", finishedAt: now }).where(and(eq(translationJobItems.jobId, jobId), eq(translationJobItems.status, "QUEUED"))).returning({ chapterId: translationJobItems.translationChapterId });
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
  const linkedLanguageMatches = row.novel?.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase();
  let publicNovelId = linkedLanguageMatches ? row.workspace.novelId : null;
  let publicNovel = linkedLanguageMatches ? row.novel : null;
  if (!publicNovelId || !publicNovel) {
    const [source] = await tx.select().from(novelImportSources)
      .where(eq(novelImportSources.id, row.workspace.importSourceId)).limit(1).for("update");
    if (!source) throw new ApiError(409, "IMPORT_SOURCE_MISSING", "ไม่พบข้อมูล Import สำหรับสร้างนิยายฉบับร่าง");
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
      const textRows = await tx.select().from(novelImportSourceTexts).where(eq(novelImportSourceTexts.sourceId, source.id));
      const sourceText = textRows.find((text) => text.language.toLowerCase() === row.workspace.sourceLanguage.toLowerCase());
      const targetText = textRows.find((text) => text.language.toLowerCase() === row.workspace.targetLanguage.toLowerCase());
      if (!sourceText) throw new ApiError(409, "IMPORT_METADATA_MISSING", "ไม่พบชื่อเรื่องต้นฉบับสำหรับสร้างนิยายฉบับร่าง");
      const [createdNovel] = await tx.insert(novels).values({
        slug: createImportedNovelSlug(source.provider, source.externalWorkId, row.workspace.targetLanguage, source.id),
        title: targetText?.title.trim() || sourceText.title,
        titleOriginal: sourceText.title,
        synopsis: targetText?.synopsis?.trim() || sourceText.synopsis?.trim() || `Translated edition of ${sourceText.title}`,
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
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ workspace: translationWorkspaces, translationChapter: translationChapters, version: translationVersions, novel: novels })
      .from(translationVersions)
      .innerJoin(translationChapters, eq(translationChapters.id, translationVersions.translationChapterId))
      .innerJoin(translationWorkspaces, eq(translationWorkspaces.id, translationChapters.workspaceId))
      .leftJoin(novels, eq(novels.id, translationWorkspaces.novelId))
      .where(and(eq(translationVersions.id, versionId), eq(translationChapters.id, chapterId), eq(translationWorkspaces.id, workspaceId))).limit(1);
    if (!row) throw new ApiError(404, "TRANSLATION_VERSION_NOT_FOUND", "ไม่พบเวอร์ชันคำแปล");
    if (row.version.status !== "APPROVED") throw new ApiError(409, "APPROVAL_REQUIRED", "เผยแพร่ได้เฉพาะเวอร์ชันที่อนุมัติแล้ว");
    if (row.translationChapter.status !== "APPROVED") throw new ApiError(409, "CURRENT_APPROVAL_REQUIRED", "สถานะตอนเปลี่ยนหลังการอนุมัติ กรุณาตรวจและอนุมัติ revision ล่าสุดอีกครั้ง");
    const now = new Date();
    const { publicNovelId, publicChapterId } = await stageApprovedTranslationDraft(tx, row, actor, now);
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
    await tx.update(novels).set({ publicationStatus: "PUBLISHED", publishedAt: sql`coalesce(${novels.publishedAt}, ${now})`, updatedBy: actor.id, updatedAt: now }).where(eq(novels.id, publicNovelId));
    await tx.update(translationVersions).set({ status: "PUBLISHED", publishedAt: now }).where(eq(translationVersions.id, versionId));
    await tx.update(translationChapters).set({ status: "PUBLISHED", updatedAt: now }).where(eq(translationChapters.id, chapterId));
    await syncPublicNovelStatistics(tx, publicNovelId, now);
    await tx.insert(domainOutboxEvents).values({ type: "chapter_published", aggregateType: "chapter", aggregateId: publicChapterId!, dedupeKey: `translation-published:${versionId}`, payload: { chapterId: publicChapterId, novelId: publicNovelId, translationVersionId: versionId } }).onConflictDoNothing();
    await writeAudit(tx, actor, "translation.version.publish", "translation_version", versionId, { status: "APPROVED" }, { status: "PUBLISHED", publicChapterId });
    return { versionId, publicChapterId, publicNovelId };
  });
}
