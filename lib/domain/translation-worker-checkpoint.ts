import { z } from "zod";

import { sha256 } from "./translation";
import { readTranslationJobMetadata, translationJobMetadataSchema } from "./translation-job";

// Increment whenever the QA prompt, output schema, or acceptance policy changes.
export const TRANSLATION_QA_CHECKPOINT_POLICY_VERSION = 2;

const checkpointChapterAnalysisSchema = z.object({
  summary: z.string(),
  continuityFacts: z.array(z.string()),
  entities: z.array(z.string()),
  glossaryCandidates: z.array(z.object({
    sourceTerm: z.string(),
    targetTerm: z.string(),
    note: z.string().nullable(),
    confidence: z.number().int().min(0).max(100),
  })),
  difficulty: z.enum(["NORMAL", "HARD"]),
  translationNotes: z.array(z.string()),
});

export const translationCheckpointSchema = z.object({ title: z.string().min(1), content: z.string().min(1) });

const qaResultSchema = z.object({
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  issues: z.array(z.object({
    code: z.string().min(1).max(80),
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
    message: z.string().min(1).max(2_000),
    location: z.enum(["TITLE", "CONTENT"]).nullable(),
    currentText: z.string().max(4_000).nullable(),
    suggestedText: z.string().max(4_000).nullable(),
  }).passthrough()).max(100),
  correctionInstructions: z.array(z.string().min(1).max(1_000)).max(50),
}).passthrough();

const qaCheckpointSchema = z.object({
  signature: z.string().regex(/^[a-f0-9]{64}$/),
  value: qaResultSchema,
});

const correctionCheckpointSchema = z.object({
  signature: z.string().regex(/^[a-f0-9]{64}$/),
  // Local corrections and paid editor repairs share the same verification budget.
  completedRounds: z.number().int().min(0).max(2),
});

const economyPolishCheckpointSchema = z.object({
  translationHash: z.string().regex(/^[a-f0-9]{64}$/),
  review: qaResultSchema,
  contextSnapshotId: z.string().uuid().optional(),
});

const jobCheckpointSchema = z.object({
  version: z.literal(1),
  sourceSnapshotId: z.string().uuid(),
  chapterAnalysis: checkpointChapterAnalysisSchema.nullable(),
  translation: translationCheckpointSchema.nullable(),
  job: translationJobMetadataSchema.optional(),
  // Bad or legacy optional state cannot invalidate a usable translation.
  qa: qaCheckpointSchema.nullable().catch(null).default(null),
  correction: correctionCheckpointSchema.nullable().catch(null).default(null),
  economyPolish: economyPolishCheckpointSchema.nullable().catch(null).default(null),
});

export type TranslationWorkerCheckpoint = Omit<z.infer<typeof jobCheckpointSchema>, "job"> & {
  job: z.infer<typeof translationJobMetadataSchema>;
};

export function readTranslationWorkerCheckpoint(value: unknown, sourceSnapshotId: string): TranslationWorkerCheckpoint {
  const job = readTranslationJobMetadata(value);
  const parsed = jobCheckpointSchema.safeParse(value);
  if (parsed.success && parsed.data.sourceSnapshotId === sourceSnapshotId) {
    const checkpoint = { ...parsed.data, job };
    return checkpoint.translation && !checkpoint.chapterAnalysis
      ? { ...checkpoint, translation: null, qa: null, correction: null, economyPolish: null }
      : checkpoint;
  }
  return { version: 1, sourceSnapshotId, chapterAnalysis: null, translation: null, qa: null, correction: null, economyPolish: null, job };
}

export function economyPolishTranslationHash(translation: z.infer<typeof translationCheckpointSchema>) {
  return sha256(JSON.stringify({ title: translation.title, content: translation.content }));
}

export function readCheckpointEconomyPolish(checkpoint: TranslationWorkerCheckpoint) {
  // This verdict belongs to the single completed editorial pass. Later changes
  // to advisory glossary entries must not buy another polish on a retry.
  return checkpoint.job.executionMode === "ECONOMY" && checkpoint.translation &&
    checkpoint.economyPolish?.translationHash === economyPolishTranslationHash(checkpoint.translation)
    ? checkpoint.economyPolish.review
    : null;
}

export type TranslationQaCheckpointInput = {
  sourceSnapshotId: string;
  sourceTitle: string;
  sourceContent: string;
  stableContext: Record<string, unknown>;
  reviewContext: Record<string, unknown>;
  model: { id: string; modelName: string; provider: string; baseUrl: string; updatedAt: Date | string };
  minimumScore: number;
  policyVersion?: number;
};

function qaReviewIdentity(input: TranslationQaCheckpointInput) {
  return {
    policyVersion: input.policyVersion ?? TRANSLATION_QA_CHECKPOINT_POLICY_VERSION,
    sourceSnapshotId: input.sourceSnapshotId,
    source: { title: input.sourceTitle, content: input.sourceContent },
    stableContext: input.stableContext,
    reviewContext: input.reviewContext,
    model: {
      id: input.model.id,
      modelName: input.model.modelName,
      provider: input.model.provider,
      baseUrl: input.model.baseUrl,
      updatedAt: new Date(input.model.updatedAt).toISOString(),
    },
    minimumScore: input.minimumScore,
  };
}

export function translationQaCheckpointSignature(input: TranslationQaCheckpointInput & {
  translation: z.infer<typeof translationCheckpointSchema>;
}) {
  return sha256(JSON.stringify({ ...qaReviewIdentity(input), translation: input.translation }));
}

export function translationCorrectionCheckpointSignature(input: TranslationQaCheckpointInput) {
  // Text is deliberately excluded: each completed repair changes it while
  // remaining part of the same bounded correction sequence.
  return sha256(JSON.stringify(qaReviewIdentity(input)));
}

export function readCheckpointQa(checkpoint: TranslationWorkerCheckpoint, signature: string) {
  return checkpoint.qa?.signature === signature ? checkpoint.qa.value : null;
}

export function readCheckpointCorrectionRounds(checkpoint: TranslationWorkerCheckpoint, signature: string) {
  return checkpoint.correction?.signature === signature ? checkpoint.correction.completedRounds : 0;
}
