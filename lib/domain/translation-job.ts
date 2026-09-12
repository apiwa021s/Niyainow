import { z } from "zod";

export const translationJobOperationSchema = z.enum(["TRANSLATE", "POLISH"]);
export type TranslationJobOperation = z.infer<typeof translationJobOperationSchema>;

const restorableChapterStatusSchema = z.enum([
  "READY",
  "STALE",
  "DRAFT",
  "QA_FAILED",
  "REVIEW",
  "APPROVED",
  "PUBLISHED",
  "FAILED",
]);

export const translationJobMetadataSchema = z.object({
  operation: translationJobOperationSchema,
  baseTranslationVersionId: z.string().uuid().nullable(),
  previousChapterStatus: restorableChapterStatusSchema.nullable(),
});

export type TranslationJobMetadata = z.infer<typeof translationJobMetadataSchema>;

const DEFAULT_TRANSLATION_JOB_METADATA: TranslationJobMetadata = {
  operation: "TRANSLATE",
  baseTranslationVersionId: null,
  previousChapterStatus: null,
};

export function createTranslationJobMetadata(input?: {
  operation?: TranslationJobOperation;
  baseTranslationVersionId?: string | null;
  previousChapterStatus?: string | null;
}): TranslationJobMetadata {
  return translationJobMetadataSchema.parse({ ...DEFAULT_TRANSLATION_JOB_METADATA, ...input });
}

export function readTranslationJobMetadata(checkpoint: unknown): TranslationJobMetadata {
  if (!checkpoint || typeof checkpoint !== "object" || Array.isArray(checkpoint)) {
    return DEFAULT_TRANSLATION_JOB_METADATA;
  }
  const parsed = translationJobMetadataSchema.safeParse((checkpoint as { job?: unknown }).job);
  return parsed.success ? parsed.data : DEFAULT_TRANSLATION_JOB_METADATA;
}

export function chapterStatusAfterCancelledJob(checkpoint: unknown) {
  const metadata = readTranslationJobMetadata(checkpoint);
  return metadata.operation === "POLISH" && metadata.previousChapterStatus
    ? metadata.previousChapterStatus
    : "READY";
}
