import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  translationAiInvocations,
  translationAiModels,
  translationChapters,
  translationContextSnapshots,
  translationJobItems,
  translationJobs,
  translationPromptVersions,
  translationQaIssues,
  translationVersions,
} from "@/db/schema";
import { createTranslationJobMetadata } from "@/lib/domain/translation-job";
import { economyPolishTranslationHash, translationCorrectionCheckpointSignature, translationQaCheckpointSignature } from "@/lib/domain/translation-worker-checkpoint";
import { processTranslationJobs } from "@/services/translation-worker";

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  qa: vi.fn(),
  patch: vi.fn(),
  rewrite: vi.fn(),
  translate: vi.fn(),
  polish: vi.fn(),
  insertVersion: vi.fn(),
  replaceIssues: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/services/ai/translation-pipeline", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/ai/translation-pipeline")>(),
  qaTranslationWithAi: mocks.qa,
  reviseTranslationWithPatchesAi: mocks.patch,
  reviseTranslationWithAi: mocks.rewrite,
  translateChapterWithCanonAi: mocks.translate,
  polishAndReviewChapterAi: mocks.polish,
}));
vi.mock("@/services/translation-version-service", () => ({
  insertTranslationVersion: mocks.insertVersion,
  replaceQaIssues: mocks.replaceIssues,
}));
vi.mock("@/lib/logger", () => ({ logger: { child: () => ({ warn: vi.fn() }) } }));

const sourceSnapshotId = "00000000-0000-4000-8000-000000000001";
const itemId = "00000000-0000-4000-8000-000000000002";
const chapterId = "00000000-0000-4000-8000-000000000003";
const jobId = "00000000-0000-4000-8000-000000000004";
const workspaceId = "00000000-0000-4000-8000-000000000005";
const mainModel = {
  id: "00000000-0000-4000-8000-000000000006",
  modelName: "gpt-5.6-sol",
  provider: "openai-compatible",
  baseUrl: "https://provider.example/v1",
  inputCostMicrosPerMillion: 4_000_000,
  outputCostMicrosPerMillion: 20_000_000,
  isActive: true,
  updatedAt: new Date(0),
};
const qaModel = { ...mainModel, id: "00000000-0000-4000-8000-000000000007", modelName: "gpt-5.6-terra" };
const economyModel = { ...mainModel, id: "00000000-0000-4000-8000-000000000008", modelName: "gpt-6-luna", inputCostMicrosPerMillion: 100_000, outputCostMicrosPerMillion: 500_000 };
const checkpoint = {
  version: 1,
  sourceSnapshotId,
  chapterAnalysis: { summary: "The prince arrives", continuityFacts: [], entities: [], glossaryCandidates: [], difficulty: "NORMAL", translationNotes: [] },
  translation: { title: "การมาถึง", content: "เจ้าชายเสด็จมาถึง" },
};
const item = { id: itemId, translationChapterId: chapterId, sourceSnapshotId, attempts: 0, checkpoint };
const job = { id: jobId, workspaceId, modelId: mainModel.id, promptVersionId: "prompt-1", requestedBy: null, startedAt: null, totalItems: 1 };
const qaValue = { passed: true, score: 98, issues: [], correctionInstructions: [] };
const qaSignatureInput = {
  sourceSnapshotId,
  sourceTitle: "Arrival",
  sourceContent: "The prince arrives.",
  translation: checkpoint.translation,
  stableContext: {
    sourceLanguage: "en",
    targetLanguage: "th",
    profile: { name: "Novel", styleGuide: "Natural Thai", instructions: "Keep all facts", preserveParagraphs: true },
    genreContext: null,
  },
  reviewContext: {
    chapterNumber: 1,
    glossary: [],
    suggestedGlossary: [],
    characters: [],
    chapterAnalysis: { summary: checkpoint.chapterAnalysis.summary, continuityFacts: [], difficulty: "NORMAL", translationNotes: [] },
  },
  model: qaModel,
  minimumScore: 90,
};
const checkedCheckpoint = { ...checkpoint, qa: { signature: translationQaCheckpointSignature(qaSignatureInput), value: qaValue } };

function memoryDatabase(checkpointValue: unknown = checkpoint, profileInstructions = "Keep all facts", requestedBy: string | null = null, totalItems = 1) {
  const storedItem = { ...item, checkpoint: checkpointValue };
  const economy = (checkpointValue as { job?: { executionMode?: string } })?.job?.executionMode === "ECONOMY";
  const configuredModel = economy ? economyModel : mainModel;
  const state = {
    ownsLease: true,
    invocations: [] as Array<Record<string, unknown>>,
    checkpointWrites: [] as unknown[],
    versionUpdates: [] as Array<Record<string, unknown>>,
    chapterUpdates: [] as Array<Record<string, unknown>>,
    itemUpdates: [] as Array<Record<string, unknown>>,
    qaIssues: [] as Array<Record<string, unknown>>,
    transactionCount: 0,
  };
  const builder = (result: () => unknown) => {
    const chain = {
      from: (table: unknown) => { void table; return chain; },
      where: (...args: unknown[]) => { void args; return chain; },
      innerJoin: (...args: unknown[]) => { void args; return chain; },
      orderBy: (...args: unknown[]) => { void args; return chain; },
      groupBy: (...args: unknown[]) => { void args; return chain; },
      limit: (...args: unknown[]) => { void args; return chain; },
      for: (...args: unknown[]) => { void args; return chain; },
      returning: (...args: unknown[]) => { void args; return chain; },
      then: (fulfilled: (value: unknown) => unknown, rejected?: (reason: unknown) => unknown) => Promise.resolve().then(result).then(fulfilled, rejected),
    };
    return chain;
  };
  const db = {
    select: (shape?: Record<string, unknown>) => {
      let table: unknown;
      const chain = builder(() => {
        if (table === translationAiModels) return [configuredModel, qaModel, economyModel];
        if (table === translationPromptVersions) return [{ id: "prompt-1", systemPrompt: "Translate all facts faithfully", isActive: true }];
        if (table === translationJobItems && shape?.item) return [{ item: storedItem, job: { ...job, requestedBy, totalItems } }];
        if (table === translationJobItems && shape?.id) return state.ownsLease ? [{ id: itemId }] : [];
        if (table === translationVersions && economy) return [{ id: "00000000-0000-4000-8000-000000000009", ...checkpoint.translation, status: "APPROVED" }];
        if (table === translationChapters && shape?.chapter) return [{
          chapter: { id: chapterId, chapterNumber: 1, workspaceId, lockVersion: 0, sourceSnapshotId },
          source: { id: sourceSnapshotId, title: "Arrival", content: "The prince arrives.", sourceHash: "source-hash" },
          workspace: { sourceLanguage: "en", targetLanguage: "th" },
          profile: { version: 1, name: "Novel", styleGuide: "Natural Thai", instructions: profileInstructions, preserveParagraphs: true },
        }];
        return [];
      });
      chain.from = (selectedTable: unknown) => { table = selectedTable; return chain; };
      return chain;
    },
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => builder(() => {
        if (table === translationJobItems && values.checkpoint) state.checkpointWrites.push(values.checkpoint);
        if (table === translationVersions) state.versionUpdates.push(values);
        if (table === translationChapters) state.chapterUpdates.push(values);
        if (table === translationJobItems) state.itemUpdates.push(values);
        if (table === translationJobItems && values.startedAt) return [{ ...storedItem, ...values }];
        if (table === translationJobItems) return state.ownsLease ? [{ id: itemId }] : [];
        if (table === translationJobs) return [{ ...job, requestedBy, totalItems, ...values }];
        return [];
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => builder(() => {
        if (table === translationAiInvocations) state.invocations.push(values);
        if (table === translationQaIssues) state.qaIssues.push(...values as unknown as Array<Record<string, unknown>>);
        return table === translationContextSnapshots ? [{ id: "00000000-0000-4000-8000-000000000010" }] : [];
      }),
    }),
  };
  const transactionalDb = {
    ...db,
    transaction: async <T>(action: (transaction: typeof db) => Promise<T>): Promise<T> => {
      state.transactionCount += 1;
      const invocationCount = state.invocations.length;
      const checkpointCount = state.checkpointWrites.length;
      try {
        return await action(db);
      } catch (error) {
        state.invocations.splice(invocationCount);
        state.checkpointWrites.splice(checkpointCount);
        throw error;
      }
    },
  };
  return { db: transactionalDb, state };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.insertVersion.mockResolvedValue({ id: "version-1" });
  mocks.replaceIssues.mockResolvedValue([]);
  mocks.qa.mockResolvedValue({
    value: qaValue,
    call: {
      task: "FIRST_QA",
      model: qaModel,
      result: { output: qaValue, providerRequestId: "billed-qa-response", inputTokens: 1_000, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 100, promptCacheEnabled: true, latencyMs: 10 },
    },
  });
  mocks.patch.mockResolvedValue(patchResponse([]));
  mocks.translate.mockResolvedValue({
    value: { translation: checkpoint.translation, chapterAnalysis: checkpoint.chapterAnalysis },
    call: {
      task: "MAIN_TRANSLATION",
      model: mainModel,
      result: { output: {}, providerRequestId: "main-response", inputTokens: 1_000, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 100, promptCacheEnabled: false, latencyMs: 10 },
    },
  });
  mocks.polish.mockResolvedValue(polishResponse(qaValue));
});

type QaValue = {
  passed: boolean;
  score: number;
  issues: Array<{
    code: string;
    severity: "INFO" | "WARNING" | "CRITICAL";
    message: string;
    location: "TITLE" | "CONTENT" | null;
    currentText: string | null;
    suggestedText: string | null;
  }>;
  correctionInstructions: string[];
};

function qaResponse(value: QaValue) {
  return {
    value,
    call: {
      task: "FIRST_QA",
      model: qaModel,
      result: { output: value, providerRequestId: "qa-response", inputTokens: 1_000, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 100, promptCacheEnabled: true, latencyMs: 10 },
    },
  };
}

function patchResponse(patches: Array<{ location: "TITLE" | "CONTENT"; currentText: string; replacementText: string }>) {
  const value = { patches, requiresFullRewrite: false, rationale: "Targeted correction" };
  return {
    value,
    call: {
      task: "ESCALATION",
      model: mainModel,
      result: { output: value, providerRequestId: "patch-response", inputTokens: 1_000, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 100, promptCacheEnabled: true, latencyMs: 10 },
    },
  };
}

function finding(currentText: string | null, suggestedText: string | null, severity: "WARNING" | "CRITICAL" = "WARNING") {
  return { code: "REGISTER", severity, message: "Correct the register", location: "CONTENT" as const, currentText, suggestedText };
}

function failedQa(issues: QaValue["issues"], score = 86): QaValue {
  return { passed: false, score, issues, correctionInstructions: ["Resolve the register findings"] };
}

function polishResponse(review: QaValue, translation = checkpoint.translation) {
  return {
    value: { ...translation, review },
    call: {
      task: "ESCALATION",
      model: economyModel,
      result: { output: {}, providerRequestId: "polish-response", inputTokens: 22_500, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 6_000, promptCacheEnabled: false, serviceTier: "flex", latencyMs: 10 },
    },
  };
}

const economyJobMetadata = createTranslationJobMetadata({ executionMode: "ECONOMY" });
const economyCheckpoint = { ...checkpoint, job: economyJobMetadata };

describe("economy translation trial", () => {
  it.each(["default", "flex"])("translates then polishes once below the sample budget with %s pricing and keeps its approved predecessor", async (serviceTier) => {
    const { db, state } = memoryDatabase({ ...economyCheckpoint, translation: null, chapterAnalysis: null }, "Keep all facts", "admin-1");
    mocks.db = db;
    mocks.translate.mockImplementation(async (input) => ({
      value: { translation: checkpoint.translation, chapterAnalysis: checkpoint.chapterAnalysis },
      call: { task: "MAIN_TRANSLATION", model: input.model, result: { output: {}, providerRequestId: "economy-main", inputTokens: 18_080, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 6_000, promptCacheEnabled: false, serviceTier, latencyMs: 10 } },
    }));
    const polished = polishResponse(qaValue);
    mocks.polish.mockResolvedValue({ ...polished, call: { ...polished.call, result: { ...polished.call.result, serviceTier } } });

    await processTranslationJobs(1, 1);

    expect(mocks.translate).toHaveBeenCalledOnce();
    expect(mocks.translate.mock.calls[0][0]).toMatchObject({ model: { modelName: "gpt-6-luna" }, reasoningEffort: "low", cache: { cacheSharedPayload: false } });
    expect(mocks.polish).toHaveBeenCalledOnce();
    expect(mocks.qa).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.rewrite).not.toHaveBeenCalled();
    expect(state.invocations).toHaveLength(2);
    expect(state.invocations.every((call) => call.modelId === economyModel.id)).toBe(true);
    // Full input without any cache discount, including two complete outputs.
    expect(state.invocations.reduce((total, call) => total + Number(call.costMicros), 0) * 35 / 1_000_000).toBeLessThan(1);
    expect(state.versionUpdates).toEqual([]);
    expect(state.chapterUpdates).toContainEqual(expect.objectContaining({ status: "REVIEW" }));
    expect(mocks.insertVersion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ parentVersionId: "00000000-0000-4000-8000-000000000009", origin: "AI" }));
  });

  it.each([false, true])("stops after its one polish when remaining findings are critical=%s", async (critical) => {
    const { db, state } = memoryDatabase(economyCheckpoint);
    mocks.db = db;
    mocks.polish.mockResolvedValue(polishResponse(failedQa([finding("เจ้าชาย", "องค์ชาย", critical ? "CRITICAL" : "WARNING")])));

    await processTranslationJobs(1, 1);

    expect(mocks.polish).toHaveBeenCalledOnce();
    expect(mocks.qa).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.rewrite).not.toHaveBeenCalled();
    expect(mocks.insertVersion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ content: checkpoint.translation.content }));
    expect(state.chapterUpdates).toContainEqual(expect.objectContaining({ status: critical ? "QA_FAILED" : "REVIEW" }));
    expect(state.qaIssues).toContainEqual(expect.objectContaining({ severity: critical ? "CRITICAL" : "WARNING" }));
  });

  it("polishes an existing version with only one paid request", async () => {
    const { db, state } = memoryDatabase({
      ...economyCheckpoint,
      translation: null,
      chapterAnalysis: null,
      job: createTranslationJobMetadata({ executionMode: "ECONOMY", operation: "POLISH", baseTranslationVersionId: "00000000-0000-4000-8000-000000000009", previousChapterStatus: "APPROVED" }),
    });
    mocks.db = db;

    await processTranslationJobs(1, 1);

    expect(mocks.translate).not.toHaveBeenCalled();
    expect(mocks.polish).toHaveBeenCalledOnce();
    expect(mocks.polish.mock.calls[0][0].translation).toEqual(checkpoint.translation);
    expect(state.invocations).toHaveLength(1);
    expect(mocks.qa).not.toHaveBeenCalled();
  });

  it("reuses the completed polish when a retry sees new profile or advisory context", async () => {
    const { db, state } = memoryDatabase({
      ...economyCheckpoint,
      economyPolish: { translationHash: economyPolishTranslationHash(checkpoint.translation), review: qaValue, contextSnapshotId: "00000000-0000-4000-8000-000000000011" },
    }, "Later profile changes require a new job");
    mocks.db = db;

    await processTranslationJobs(1, 1);

    expect(mocks.polish).not.toHaveBeenCalled();
    expect(mocks.qa).not.toHaveBeenCalled();
    expect(state.invocations).toEqual([]);
    expect(mocks.insertVersion).toHaveBeenCalledOnce();
    expect(mocks.insertVersion).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ contextSnapshotId: "00000000-0000-4000-8000-000000000011" }));
  });

  it("saves the paid polish before final persistence so a database retry does not repeat it", async () => {
    const first = memoryDatabase(economyCheckpoint);
    mocks.db = first.db;
    mocks.insertVersion.mockRejectedValueOnce(new Error("Temporary database failure"));
    await processTranslationJobs(1, 1);
    const saved = first.state.checkpointWrites.find((value) => Boolean((value as { economyPolish?: unknown }).economyPolish));
    expect(saved).toBeTruthy();

    const retry = memoryDatabase(saved);
    mocks.db = retry.db;
    await processTranslationJobs(1, 1);

    expect(mocks.polish).toHaveBeenCalledOnce();
    expect(retry.state.invocations).toEqual([]);
  });

  it("records a completed paid polish after cancellation but discards the new manuscript", async () => {
    const { db, state } = memoryDatabase(economyCheckpoint);
    mocks.db = db;
    mocks.polish.mockImplementation(async () => { state.ownsLease = false; return polishResponse(qaValue); });

    await processTranslationJobs(1, 1);

    expect(state.invocations).toEqual([expect.objectContaining({ task: "ESCALATION", status: "SUCCESS", providerRequestId: "polish-response" })]);
    expect(state.checkpointWrites).toEqual([]);
    expect(mocks.insertVersion).not.toHaveBeenCalled();
  });
});

describe("translation worker ownership", () => {
  it("resumes a matching saved QA verdict without another billed QA call", async () => {
    const { db, state } = memoryDatabase(checkedCheckpoint);
    mocks.db = db;

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).not.toHaveBeenCalled();
    expect(state.invocations).toEqual([]);
    expect(mocks.insertVersion).toHaveBeenCalledOnce();
  });

  it.each(["translation", "profile"])("runs fresh QA when the %s changes", async (changed) => {
    const { db, state } = changed === "translation"
      ? memoryDatabase({ ...checkedCheckpoint, translation: { ...checkpoint.translation, content: "องค์ชายเสด็จมาถึง" } })
      : memoryDatabase(checkedCheckpoint, "Use formal court dialogue");
    mocks.db = db;

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).toHaveBeenCalledOnce();
    expect(state.invocations).toHaveLength(1);
    expect(mocks.insertVersion).toHaveBeenCalledOnce();
    const input = mocks.qa.mock.calls[0][0];
    expect(input.context).not.toHaveProperty("sourceLanguage");
    expect(input.context).not.toHaveProperty("targetLanguage");
    expect(input.context).not.toHaveProperty("profile");
    expect(input.cache.stablePayload.context).toMatchObject({ sourceLanguage: "en", targetLanguage: "th", profile: { instructions: changed === "profile" ? "Use formal court dialogue" : "Keep all facts" } });
    expect(state.checkpointWrites[0]).toMatchObject({ qa: { value: qaValue } });
  });

  it("records a billed QA response after cancellation without saving its checkpoint or translation", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    mocks.qa.mockImplementation(async () => {
      state.ownsLease = false;
      return {
        value: { passed: true, score: 98, issues: [], correctionInstructions: [] },
        call: {
          task: "FIRST_QA",
          model: qaModel,
          result: { output: {}, providerRequestId: "billed-qa-response", inputTokens: 1_000, cachedInputTokens: 0, cacheWriteInputTokens: 0, outputTokens: 100, promptCacheEnabled: true, latencyMs: 10 },
        },
      };
    });

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).toHaveBeenCalledOnce();
    expect(state.invocations).toEqual([expect.objectContaining({ providerRequestId: "billed-qa-response", task: "FIRST_QA", status: "SUCCESS", costMicros: 6_000 })]);
    expect(state.checkpointWrites).toEqual([]);
    expect(mocks.insertVersion).not.toHaveBeenCalled();
    expect(mocks.replaceIssues).not.toHaveBeenCalled();
  });
});

describe("translation worker bounded corrections", () => {
  it.each([1, 2])("avoids a speculative main cache write for a one-chapter job while retaining multi-chapter caching (%s items)", async (totalItems) => {
    const { db } = memoryDatabase({ ...checkpoint, chapterAnalysis: null, translation: null }, "Keep all facts", null, totalItems);
    mocks.db = db;

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    const mainCache = mocks.translate.mock.calls[0][0].cache;
    expect(mainCache.cacheSharedPayload).toBe(totalItems === 1 ? false : undefined);
    expect(mainCache.stablePayload.context.profile.instructions).toBe("Keep all facts");
    expect(mocks.qa.mock.calls[0][0].cache.cacheSharedPayload).toBeUndefined();
  });

  it("combines partial local fixes with the editor before a single verification QA", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    const events: string[] = [];
    mocks.qa.mockImplementationOnce(async () => {
      events.push("QA");
      return qaResponse(failedQa([finding("เจ้าชาย", "องค์ชาย", "CRITICAL"), finding(null, null, "CRITICAL")]));
    }).mockImplementationOnce(async () => {
      events.push("QA");
      return qaResponse(qaValue);
    });
    mocks.patch.mockImplementation(async () => {
      events.push("PATCH");
      return patchResponse([{ location: "CONTENT", currentText: "เสด็จมาถึง", replacementText: "ทรงมาถึง" }]);
    });

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(events).toEqual(["QA", "PATCH", "QA"]);
    expect(mocks.patch.mock.calls[0][0].translatedContent).toBe("องค์ชายเสด็จมาถึง");
    expect(mocks.patch.mock.calls[0][0].qa.issues).toHaveLength(1);
    expect(mocks.qa.mock.calls[1][0].translatedContent).toBe("องค์ชายทรงมาถึง");
    expect(mocks.insertVersion.mock.calls[0][1].content).toBe("องค์ชายทรงมาถึง");
    expect(state.checkpointWrites).toContainEqual(expect.objectContaining({ correction: expect.objectContaining({ completedRounds: 1 }) }));
    expect(mocks.rewrite).not.toHaveBeenCalled();
  });

  it("verifies complete local corrections without buying a patch request", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    mocks.qa.mockResolvedValueOnce(qaResponse(failedQa([finding("เจ้าชาย", "องค์ชาย")]))).mockResolvedValueOnce(qaResponse(qaValue));

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).toHaveBeenCalledTimes(2);
    expect(mocks.qa.mock.calls[1][0].translatedContent).toBe("องค์ชายเสด็จมาถึง");
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(state.checkpointWrites).toContainEqual(expect.objectContaining({ correction: expect.objectContaining({ completedRounds: 1 }) }));
  });

  it("applies newly returned low-score suggestions after a patch and verifies the final draft", async () => {
    const { db, state } = memoryDatabase();
    mocks.db = db;
    mocks.qa.mockResolvedValueOnce(qaResponse(failedQa([finding(null, null, "CRITICAL")])));
    mocks.qa.mockResolvedValueOnce(qaResponse(failedQa([finding("เสด็จมาถึง", "ทรงมาถึง")])));
    mocks.qa.mockResolvedValueOnce(qaResponse(qaValue));
    mocks.patch.mockResolvedValue(patchResponse([{ location: "CONTENT", currentText: "เจ้าชาย", replacementText: "องค์ชาย" }]));

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.patch).toHaveBeenCalledOnce();
    expect(mocks.qa).toHaveBeenCalledTimes(3);
    expect(mocks.qa.mock.calls[2][0].translatedContent).toBe("องค์ชายทรงมาถึง");
    expect(mocks.insertVersion.mock.calls[0][1].content).toBe("องค์ชายทรงมาถึง");
    expect(state.checkpointWrites).toContainEqual(expect.objectContaining({ correction: expect.objectContaining({ completedRounds: 2 }) }));
  });

  it("stops after two corrective passes and preserves unverified final suggestions for human review", async () => {
    const { db, state } = memoryDatabase(checkpoint, "Keep all facts", "reviewer-1");
    mocks.db = db;
    mocks.qa.mockResolvedValueOnce(qaResponse(failedQa([finding("เจ้าชาย", "องค์ชาย")])));
    mocks.qa.mockResolvedValueOnce(qaResponse(failedQa([finding("เสด็จมาถึง", "ทรงมาถึง")])));
    mocks.qa.mockResolvedValueOnce(qaResponse(failedQa([finding("องค์ชาย", "เจ้าชาย")])));

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).toHaveBeenCalledTimes(3);
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.insertVersion.mock.calls[0][1].content).toBe("องค์ชายทรงมาถึง");
    expect(state.versionUpdates).not.toContainEqual(expect.objectContaining({ status: "APPROVED" }));
    expect(state.qaIssues).toContainEqual(expect.objectContaining({ metadata: expect.objectContaining({ score: 86, currentText: "องค์ชาย", suggestedText: "เจ้าชาย" }) }));
  });

  it("retains completed local corrective passes on retry", async () => {
    const exhaustedCheckpoint = {
      ...checkedCheckpoint,
      qa: { signature: translationQaCheckpointSignature(qaSignatureInput), value: failedQa([finding("เจ้าชาย", "องค์ชาย", "CRITICAL")]) },
      correction: { signature: translationCorrectionCheckpointSignature(qaSignatureInput), completedRounds: 2 },
    };
    const { db } = memoryDatabase(exhaustedCheckpoint);
    mocks.db = db;

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).not.toHaveBeenCalled();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.insertVersion.mock.calls[0][1].content).toBe(checkpoint.translation.content);
  });

  it("bounds paid repairs at two and preserves final critical findings", async () => {
    const { db, state } = memoryDatabase(checkpoint, "Keep all facts", "reviewer-1");
    mocks.db = db;
    mocks.qa.mockResolvedValue(qaResponse(failedQa([finding(null, null, "CRITICAL")])));

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.patch).toHaveBeenCalledTimes(2);
    expect(mocks.qa).toHaveBeenCalledTimes(3);
    expect(mocks.rewrite).not.toHaveBeenCalled();
    expect(state.versionUpdates).not.toContainEqual(expect.objectContaining({ status: "APPROVED" }));
    expect(state.qaIssues).toContainEqual(expect.objectContaining({ severity: "CRITICAL" }));
    expect(state.checkpointWrites).toContainEqual(expect.objectContaining({ correction: expect.objectContaining({ completedRounds: 2 }) }));
  });

  it("keeps accepted warning-only exact fixes local without another QA request", async () => {
    const { db } = memoryDatabase();
    mocks.db = db;
    mocks.qa.mockResolvedValueOnce(qaResponse({ ...qaValue, issues: [finding("เจ้าชาย", "องค์ชาย")] }));

    await expect(processTranslationJobs(1, 1)).resolves.toEqual({ processed: 1 });

    expect(mocks.qa).toHaveBeenCalledOnce();
    expect(mocks.patch).not.toHaveBeenCalled();
    expect(mocks.insertVersion.mock.calls[0][1].content).toBe("องค์ชายเสด็จมาถึง");
  });
});
