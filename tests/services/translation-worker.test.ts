import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  translationAiInvocations,
  translationAiModels,
  translationChapters,
  translationContextSnapshots,
  translationJobItems,
  translationJobs,
  translationPromptVersions,
} from "@/db/schema";
import { translationQaCheckpointSignature } from "@/lib/domain/translation-worker-checkpoint";
import { processTranslationJobs } from "@/services/translation-worker";

const mocks = vi.hoisted(() => ({
  db: null as unknown,
  qa: vi.fn(),
  insertVersion: vi.fn(),
  replaceIssues: vi.fn(),
}));

vi.mock("@/db", () => ({ getDb: () => mocks.db }));
vi.mock("@/services/ai/translation-pipeline", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/services/ai/translation-pipeline")>(),
  qaTranslationWithAi: mocks.qa,
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
const checkpoint = {
  version: 1,
  sourceSnapshotId,
  chapterAnalysis: { summary: "The prince arrives", continuityFacts: [], entities: [], glossaryCandidates: [], difficulty: "NORMAL", translationNotes: [] },
  translation: { title: "การมาถึง", content: "เจ้าชายเสด็จมาถึง" },
};
const item = { id: itemId, translationChapterId: chapterId, sourceSnapshotId, attempts: 0, checkpoint };
const job = { id: jobId, workspaceId, modelId: mainModel.id, promptVersionId: "prompt-1", requestedBy: null, startedAt: null };
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

function memoryDatabase(checkpointValue: unknown = checkpoint, profileInstructions = "Keep all facts") {
  const storedItem = { ...item, checkpoint: checkpointValue };
  const state = {
    ownsLease: true,
    invocations: [] as Array<Record<string, unknown>>,
    checkpointWrites: [] as unknown[],
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
        if (table === translationAiModels) return [mainModel, qaModel];
        if (table === translationPromptVersions) return [{ id: "prompt-1", isActive: true }];
        if (table === translationJobItems && shape?.item) return [{ item: storedItem, job }];
        if (table === translationJobItems && shape?.id) return state.ownsLease ? [{ id: itemId }] : [];
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
        if (table === translationJobItems && values.startedAt) return [{ ...storedItem, ...values }];
        if (table === translationJobItems) return state.ownsLease ? [{ id: itemId }] : [];
        if (table === translationJobs) return [{ ...job, ...values }];
        return [];
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => builder(() => {
        if (table === translationAiInvocations) state.invocations.push(values);
        return table === translationContextSnapshots ? [{ id: "context-1" }] : [];
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
