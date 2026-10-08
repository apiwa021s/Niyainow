import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";

import {
  translationAiModels,
  translationChapters,
  translationJobItems,
  translationJobs,
  translationProfiles,
  translationPromptVersions,
  translationVersions,
  translationWorkspaces,
} from "@/db/schema";
import { AUTOMATIC_TRANSLATION_MODELS } from "@/lib/domain/translation-ai-routing";
import { enqueueTranslation, enqueueTranslationSchema, getTranslationVersion } from "@/services/translation-service";

const mocks = vi.hoisted(() => ({ db: null as unknown, authorize: vi.fn() }));
vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/lib/auth/dal", () => ({ assertTranslationPermission: mocks.authorize }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/lib/redis/invalidation", () => ({ invalidateChapterCache: vi.fn(), invalidateNovelCache: vi.fn() }));
vi.mock("@/services/translation-master-service", () => ({ getTranslationMasterOverview: vi.fn(), loadApprovedTranslationMasterBundle: vi.fn() }));
vi.mock("@/services/translation-version-service", () => ({ insertTranslationVersion: vi.fn(), replaceQaIssues: vi.fn() }));

const workspaceId = "00000000-0000-4000-8000-000000000001";
const chapterId = "00000000-0000-4000-8000-000000000002";
const sourceSnapshotId = "00000000-0000-4000-8000-000000000003";
const promptId = "00000000-0000-4000-8000-000000000004";
const baseVersionId = "00000000-0000-4000-8000-000000000005";
const jobId = "00000000-0000-4000-8000-000000000006";
const models = AUTOMATIC_TRANSLATION_MODELS.map((model, index) => ({
  ...model,
  id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, "0")}`,
  provider: "openai-compatible",
  isActive: true,
  supportedLanguagePairs: ["*"],
  selectionPriority: 100,
}));

function memoryDatabase(availableModels = models) {
  const state = { job: null as Record<string, unknown> | null, items: [] as Array<Record<string, unknown>> };
  const chain = (result: () => unknown) => {
    const builder = {
      where: (...args: unknown[]) => { void args; return builder; },
      limit: (...args: unknown[]) => { void args; return builder; },
      orderBy: (...args: unknown[]) => { void args; return builder; },
      for: (...args: unknown[]) => { void args; return builder; },
      returning: () => builder,
      then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve().then(result).then(resolve, reject),
    };
    return builder;
  };
  const db = {
    select: () => ({ from: (table: unknown) => chain(() => {
      if (table === translationAiModels) return availableModels;
      if (table === translationPromptVersions) return [{ id: promptId }];
      if (table === translationWorkspaces) return [{ id: workspaceId, status: "READY", sourceLanguage: "en", targetLanguage: "th" }];
      if (table === translationJobs) return [];
      if (table === translationProfiles) return [{ version: 1 }];
      if (table === translationChapters) return [{ id: chapterId, sourceSnapshotId, status: "APPROVED" }];
      if (table === translationVersions) return [{ id: baseVersionId, chapterId }];
      throw new Error("Unexpected select");
    }) }),
    insert: (table: unknown) => ({ values: (values: Record<string, unknown> | Array<Record<string, unknown>>) => {
      if (table === translationJobs) state.job = values as Record<string, unknown>;
      if (table === translationJobItems) state.items = values as Array<Record<string, unknown>>;
      const builder = chain(() => table === translationJobs ? [{ ...state.job, id: jobId }] : []);
      return { ...builder, onConflictDoUpdate: () => builder, onConflictDoNothing: () => builder };
    } }),
    update: () => ({ set: () => chain(() => []) }),
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback(db),
  };
  return { db, state };
}

const request = { chapterIds: [chapterId], idempotencyKey: "test-translation-job-1" };

beforeEach(() => {
  mocks.authorize.mockReset().mockResolvedValue({ id: "actor-1" });
  vi.stubEnv("AI_TRANSLATION_API_KEY", "test-key");
  vi.stubEnv("AI_TRANSLATION_BASE_URL", "https://api.openai.com/v1");
});

function versionDatabase() {
  const version = {
    id: baseVersionId,
    revision: 1,
    parentVersionId: null,
    title: "Original approved title",
    content: "Original approved content",
    status: "APPROVED",
    origin: "MANUAL",
    createdAt: new Date("2026-10-08T16:00:00.000Z"),
  };
  let query: { sql: string; params: unknown[] } | null = null;
  const select = vi.fn(() => ({ from: () => ({ innerJoin: () => ({ where: (condition: SQL) => {
    query = new PgDialect().sqlToQuery(condition);
    return { limit: async () => (
      query!.params[0] === baseVersionId && query!.params[1] === chapterId && query!.params[2] === workspaceId
        ? [version]
        : []
    ) };
  } }) }) }));
  return { db: { select }, select, version, query: () => query };
}

describe("prior translation version lookup", () => {
  it("returns only the selected version after requiring view permission and all ownership scopes", async () => {
    const fixture = versionDatabase();
    mocks.db = fixture.db;
    expect(await getTranslationVersion(workspaceId, chapterId, baseVersionId)).toEqual({
      version: { ...fixture.version, createdAt: fixture.version.createdAt.toISOString() },
    });
    expect(mocks.authorize).toHaveBeenCalledWith("translation.view");
    expect(fixture.query()?.sql).toContain('"translation_versions"."id"');
    expect(fixture.query()?.sql).toContain('"translation_chapters"."id"');
    expect(fixture.query()?.sql).toContain('"translation_chapters"."workspace_id"');
    expect(fixture.query()?.params).toEqual([baseVersionId, chapterId, workspaceId]);
  });

  it.each([
    [sourceSnapshotId, chapterId, baseVersionId],
    [workspaceId, sourceSnapshotId, baseVersionId],
    [workspaceId, chapterId, sourceSnapshotId],
  ])("returns 404 for a mismatched workspace, chapter or version", async (workspace, chapter, version) => {
    const fixture = versionDatabase();
    mocks.db = fixture.db;
    await expect(getTranslationVersion(workspace, chapter, version)).rejects.toMatchObject({
      status: 404, code: "TRANSLATION_VERSION_NOT_FOUND",
    });
  });

  it.each([
    ["", chapterId, baseVersionId],
    [workspaceId, "not-a-uuid", baseVersionId],
    [workspaceId, chapterId, ""],
  ])("returns 404 without querying for malformed identifiers", async (workspace, chapter, version) => {
    const fixture = versionDatabase();
    mocks.db = fixture.db;
    await expect(getTranslationVersion(workspace, chapter, version)).rejects.toMatchObject({ status: 404 });
    expect(fixture.select).not.toHaveBeenCalled();
  });

  it("does not read any text when permission is denied", async () => {
    const fixture = versionDatabase();
    mocks.db = fixture.db;
    const denied = new Error("Access denied");
    mocks.authorize.mockRejectedValueOnce(denied);
    await expect(getTranslationVersion(workspaceId, chapterId, baseVersionId)).rejects.toBe(denied);
    expect(fixture.select).not.toHaveBeenCalled();
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("translation job execution mode", () => {
  it("defaults new API requests to economy and validates explicit modes", () => {
    expect(enqueueTranslationSchema.parse(request).executionMode).toBe("ECONOMY");
    expect(enqueueTranslationSchema.parse({ ...request, executionMode: "STANDARD" }).executionMode).toBe("STANDARD");
    expect(enqueueTranslationSchema.safeParse({ ...request, executionMode: "UNKNOWN" }).success).toBe(false);
  });

  it("selects Luna and stores economy mode for a new translation", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    await enqueueTranslation(workspaceId, enqueueTranslationSchema.parse(request));
    expect(state.job?.modelId).toBe(models.find((model) => model.modelName === "gpt-6-luna")?.id);
    expect(state.items[0].checkpoint).toMatchObject({ job: { operation: "TRANSLATE", executionMode: "ECONOMY" } });
  });

  it("preserves the comparison version and prior status for economy polish", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    await enqueueTranslation(workspaceId, enqueueTranslationSchema.parse({ ...request, operation: "POLISH" }));
    expect(state.items[0].checkpoint).toMatchObject({
      job: { operation: "POLISH", executionMode: "ECONOMY", baseTranslationVersionId: baseVersionId, previousChapterStatus: "APPROVED" },
    });
  });

  it("keeps the original Sol routing available through standard mode", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    await enqueueTranslation(workspaceId, enqueueTranslationSchema.parse({ ...request, executionMode: "STANDARD" }));
    expect(state.job?.modelId).toBe(models.find((model) => model.modelName === "gpt-5.6-sol")?.id);
    expect(state.items[0].checkpoint).toMatchObject({ job: { executionMode: "STANDARD" } });
  });

  it("rejects an expensive explicit model in economy mode before creating a job", async () => {
    const sol = models.find((model) => model.modelName === "gpt-5.6-sol")!;
    const { db, state } = memoryDatabase([sol]);
    mocks.db = db;
    await expect(enqueueTranslation(workspaceId, enqueueTranslationSchema.parse({ ...request, modelId: sol.id, promptVersionId: promptId })))
      .rejects.toMatchObject({ code: "ECONOMY_MODEL_REQUIRED" });
    expect(state.job).toBeNull();
  });

  it("fails safely if Luna is unavailable instead of choosing a pricier fallback", async () => {
    const { db, state } = memoryDatabase(models.filter((model) => model.modelName !== "gpt-6-luna"));
    mocks.db = db;
    await expect(enqueueTranslation(workspaceId, enqueueTranslationSchema.parse(request)))
      .rejects.toMatchObject({ code: "AI_CONFIG_UNAVAILABLE" });
    expect(state.job).toBeNull();
  });
});
