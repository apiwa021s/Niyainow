import { describe, expect, it } from "vitest";

import { createTranslationJobMetadata } from "./translation-job";
import {
  readCheckpointCorrectionRounds,
  readCheckpointQa,
  readTranslationWorkerCheckpoint,
  translationCorrectionCheckpointSignature,
  translationQaCheckpointSignature,
  type TranslationQaCheckpointInput,
} from "./translation-worker-checkpoint";

const sourceSnapshotId = "00000000-0000-4000-8000-000000000001";
const chapterAnalysis = {
  summary: "An arrival",
  continuityFacts: ["The prince arrives"],
  entities: ["prince"],
  glossaryCandidates: [],
  difficulty: "NORMAL",
  translationNotes: ["Keep formal dialogue"],
};
const translation = { title: "การมาถึง", content: "เจ้าชายเสด็จมาถึง" };
const reviewInput: TranslationQaCheckpointInput & { translation: typeof translation } = {
  sourceSnapshotId,
  sourceTitle: "Arrival",
  sourceContent: "The prince arrives.",
  stableContext: { sourceLanguage: "en", targetLanguage: "th", profile: { instructions: "Formal court dialogue" }, genreContext: { genre: "fantasy" } },
  reviewContext: {
    chapterNumber: 1,
    glossary: [{ source: "prince", target: "เจ้าชาย", note: "A royal heir" }],
    suggestedGlossary: [],
    characters: [{ sourceName: "prince", targetName: "เจ้าชาย" }],
    chapterAnalysis,
  },
  model: { id: "qa-model-1", modelName: "qa-model", provider: "OPENAI", baseUrl: "https://api.openai.com/v1", updatedAt: new Date("2026-01-01T00:00:00.000Z") },
  minimumScore: 90,
  translation,
};
const qa = {
  passed: false,
  score: 89,
  issues: [{ code: "REGISTER", severity: "WARNING", message: "Use formal register", location: "CONTENT", currentText: "เจ้าชาย", suggestedText: "องค์ชาย" }],
  correctionInstructions: ["Preserve the court register"],
};

function savedCheckpoint() {
  return readTranslationWorkerCheckpoint({
    version: 1,
    sourceSnapshotId,
    chapterAnalysis,
    translation,
    qa: { signature: translationQaCheckpointSignature(reviewInput), value: qa },
    correction: { signature: translationCorrectionCheckpointSignature(reviewInput), completedRounds: 2 },
  }, sourceSnapshotId);
}

describe("translation worker checkpoints", () => {
  it("reuses the full QA verdict and completed correction count after a JSON round trip", () => {
    const checkpoint = readTranslationWorkerCheckpoint(JSON.parse(JSON.stringify(savedCheckpoint())), sourceSnapshotId);
    expect(readCheckpointQa(checkpoint, translationQaCheckpointSignature(reviewInput))).toEqual(qa);
    expect(readCheckpointCorrectionRounds(checkpoint, translationCorrectionCheckpointSignature(reviewInput))).toBe(2);
    expect(translationQaCheckpointSignature({ ...reviewInput, model: { ...reviewInput.model, updatedAt: "2026-01-01T00:00:00.000Z" } })).toBe(translationQaCheckpointSignature(reviewInput));
  });

  const changes: Array<[string, Partial<typeof reviewInput>]> = [
    ["source snapshot", { sourceSnapshotId: "00000000-0000-4000-8000-000000000002" }],
    ["source title", { sourceTitle: "Departure" }],
    ["source text", { sourceContent: "The prince departs." }],
    ["language", { stableContext: { ...reviewInput.stableContext, targetLanguage: "fr" } }],
    ["profile", { stableContext: { ...reviewInput.stableContext, profile: { instructions: "Modern speech" } } }],
    ["genre", { stableContext: { ...reviewInput.stableContext, genreContext: { genre: "historical" } } }],
    ["locked glossary", { reviewContext: { ...reviewInput.reviewContext, glossary: [{ source: "prince", target: "องค์ชาย" }] } }],
    ["suggested glossary", { reviewContext: { ...reviewInput.reviewContext, suggestedGlossary: [{ source: "prince", target: "องค์ชาย" }] } }],
    ["characters", { reviewContext: { ...reviewInput.reviewContext, characters: [{ sourceName: "prince", targetName: "องค์ชาย" }] } }],
    ["chapter analysis", { reviewContext: { ...reviewInput.reviewContext, chapterAnalysis: { ...chapterAnalysis, summary: "A departure" } } }],
    ["chapter number", { reviewContext: { ...reviewInput.reviewContext, chapterNumber: 2 } }],
    ["model identity", { model: { ...reviewInput.model, id: "qa-model-2" } }],
    ["model name", { model: { ...reviewInput.model, modelName: "new-qa-model" } }],
    ["model version", { model: { ...reviewInput.model, updatedAt: new Date("2026-02-01T00:00:00.000Z") } }],
    ["provider", { model: { ...reviewInput.model, provider: "ANTHROPIC" } }],
    ["endpoint", { model: { ...reviewInput.model, baseUrl: "https://provider.example/v1" } }],
    ["higher threshold", { minimumScore: 95 }],
    ["lower threshold", { minimumScore: 85 }],
    ["QA policy", { policyVersion: 2 }],
  ];

  it.each(changes)("rejects stale QA and repair rounds when %s changes", (_label, change) => {
    const checkpoint = savedCheckpoint();
    const changedInput = { ...reviewInput, ...change };
    expect(readCheckpointQa(checkpoint, translationQaCheckpointSignature(changedInput))).toBeNull();
    expect(readCheckpointCorrectionRounds(checkpoint, translationCorrectionCheckpointSignature(changedInput))).toBe(0);
  });

  it.each([
    { title: "การจากไป", content: translation.content },
    { title: translation.title, content: "องค์ชายเสด็จมาถึง" },
  ])("requires fresh QA for changed translation while retaining the bounded repair sequence", (changedTranslation) => {
    const checkpoint = savedCheckpoint();
    const changedInput = { ...reviewInput, translation: changedTranslation };
    expect(readCheckpointQa(checkpoint, translationQaCheckpointSignature(changedInput))).toBeNull();
    expect(readCheckpointCorrectionRounds(checkpoint, translationCorrectionCheckpointSignature(changedInput))).toBe(2);
  });

  it("reads legacy checkpoints without QA or correction state", () => {
    const checkpoint = readTranslationWorkerCheckpoint({ version: 1, sourceSnapshotId, chapterAnalysis, translation }, sourceSnapshotId);
    expect(checkpoint.translation).toEqual(translation);
    expect(checkpoint.qa).toBeNull();
    expect(checkpoint.correction).toBeNull();
    expect(checkpoint.job.operation).toBe("TRANSLATE");
  });

  it("preserves POLISH metadata in initial, legacy, mismatched and malformed checkpoints", () => {
    const job = createTranslationJobMetadata({ operation: "POLISH", baseTranslationVersionId: "00000000-0000-4000-8000-000000000003", previousChapterStatus: "PUBLISHED" });
    for (const value of [
      { job },
      { ...savedCheckpoint(), job },
      { ...savedCheckpoint(), job, sourceSnapshotId: "00000000-0000-4000-8000-000000000002" },
      { ...savedCheckpoint(), job, chapterAnalysis: "invalid" },
    ]) {
      expect(readTranslationWorkerCheckpoint(value, sourceSnapshotId).job).toEqual(job);
    }
  });

  it("discards content and verdicts from another source snapshot", () => {
    expect(readTranslationWorkerCheckpoint(savedCheckpoint(), "00000000-0000-4000-8000-000000000002")).toMatchObject({ chapterAnalysis: null, translation: null, qa: null, correction: null });
  });

  it("rejects malformed optional QA and rounds without losing a usable translation", () => {
    const checkpoint = readTranslationWorkerCheckpoint({ ...savedCheckpoint(), qa: { signature: "bad", value: qa }, correction: { signature: translationCorrectionCheckpointSignature(reviewInput), completedRounds: 99 } }, sourceSnapshotId);
    expect(checkpoint.translation).toEqual(translation);
    expect(checkpoint.qa).toBeNull();
    expect(checkpoint.correction).toBeNull();
  });

  it("drops a translation and QA when its required chapter analysis is missing", () => {
    expect(readTranslationWorkerCheckpoint({ ...savedCheckpoint(), chapterAnalysis: null }, sourceSnapshotId)).toMatchObject({ translation: null, qa: null, correction: null });
  });

  it("preserves additional QA fields so stored verdicts remain complete", () => {
    const value = { ...qa, notes: ["Additional QA detail"], issues: [{ ...qa.issues[0], sourceQuote: "prince" }] };
    const checkpoint = readTranslationWorkerCheckpoint({ ...savedCheckpoint(), qa: { signature: translationQaCheckpointSignature(reviewInput), value } }, sourceSnapshotId);
    expect(checkpoint.qa?.value).toEqual(value);
  });
});
