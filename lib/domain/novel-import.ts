import { z } from "zod";

export const IMPORT_TRANSLATION_STATUSES = ["draft", "reviewed", "approved"] as const;

export const languageTagSchema = z.string().trim().min(2).max(35).transform((value, context) => {
  try {
    const [canonical] = Intl.getCanonicalLocales(value);
    if (!canonical) throw new RangeError("Missing language tag");
    return canonical;
  } catch {
    context.addIssue({ code: "custom", message: "Must be a valid BCP 47 language tag" });
    return z.NEVER;
  }
});

const httpUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
}, "Must use HTTPS, except for a loopback development URL");

const providerSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/u);
const externalWorkIdSchema = z.string().trim().min(1).max(256);
const titleSchema = z.string().trim().min(1).max(1_000);
const contentSchema = z.string().trim().min(1).max(2_000_000);

const sourceLocalizationSchema = z.object({
  language: languageTagSchema,
  title: titleSchema,
  synopsis: z.string().trim().max(20_000).optional(),
  status: z.enum(IMPORT_TRANSLATION_STATUSES).default("draft"),
}).strict();

export const novelImportSourceInputSchema = z.object({
  provider: providerSchema,
  externalWorkId: externalWorkIdSchema,
  seedUrl: httpUrlSchema,
  originalTitle: titleSchema,
  sourceLanguage: languageTagSchema.default("en"),
  originalSynopsis: z.string().trim().max(20_000).optional(),
  localizations: z.array(sourceLocalizationSchema).max(20).default([]),
  metadata: z.record(z.string().max(80), z.unknown()).default({}),
}).strict().superRefine((input, context) => {
  const seen = new Set<string>([input.sourceLanguage]);
  input.localizations.forEach((localization, index) => {
    if (seen.has(localization.language)) {
      context.addIssue({
        code: "custom",
        path: ["localizations", index, "language"],
        message: "Each language may appear only once and must differ from sourceLanguage",
      });
    }
    seen.add(localization.language);
  });
});

const chapterTranslationSchema = z.object({
  language: languageTagSchema,
  title: z.string().trim().min(1).max(1_000).optional(),
  content: z.string().trim().min(1).max(2_000_000).optional(),
  status: z.enum(IMPORT_TRANSLATION_STATUSES).default("draft"),
}).strict().refine((input) => input.title !== undefined || input.content !== undefined, {
  message: "A translation must contain a title or content",
});

export const novelImportChapterInputSchema = z.object({
  chapterNumber: z.number().int().min(1).max(10_000_000),
  sourceUrl: httpUrlSchema,
  originalTitle: titleSchema,
  originalText: contentSchema,
  sourceLanguage: languageTagSchema.optional(),
  fetchedAt: z.iso.datetime({ offset: true }),
  translations: z.array(chapterTranslationSchema).max(20).default([]),
}).strict().superRefine((input, context) => {
  const seen = new Set<string>();
  input.translations.forEach((translation, index) => {
    if (seen.has(translation.language)) {
      context.addIssue({
        code: "custom",
        path: ["translations", index, "language"],
        message: "Each translation language may appear only once",
      });
    }
    if (input.sourceLanguage === translation.language) {
      context.addIssue({
        code: "custom",
        path: ["translations", index, "language"],
        message: "A translation language must differ from the source language",
      });
    }
    seen.add(translation.language);
  });
});

export const novelImportChapterBatchInputSchema = z.object({
  provider: providerSchema,
  externalWorkId: externalWorkIdSchema,
  chapters: z.array(novelImportChapterInputSchema).min(1).max(20),
}).strict().superRefine((input, context) => {
  const seen = new Set<number>();
  input.chapters.forEach((chapter, index) => {
    if (seen.has(chapter.chapterNumber)) {
      context.addIssue({
        code: "custom",
        path: ["chapters", index, "chapterNumber"],
        message: "Each chapterNumber may appear only once per batch",
      });
    }
    seen.add(chapter.chapterNumber);
  });
});

export type NovelImportSourceInput = z.infer<typeof novelImportSourceInputSchema>;
export type NovelImportChapterBatchInput = z.infer<typeof novelImportChapterBatchInputSchema>;
