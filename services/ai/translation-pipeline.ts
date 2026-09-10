import "server-only";

import { z } from "zod";

import type { translationAiModels, translationPromptVersions } from "@/db/schema";
import type { AutomaticTranslationTask } from "@/lib/domain/translation-ai-routing";
import { selectTranslationGenreContext } from "@/lib/domain/translation-genre-context";
import { buildTranslationMasterRoutingCatalog, selectTranslationMasterContext, type TranslationMasterBundle, type TranslationMasterSelection } from "@/lib/domain/translation-master";
import { getTranslationProvider, type PromptCacheInput, type StructuredAiResult } from "@/services/ai/translation-provider";

type AiModel = typeof translationAiModels.$inferSelect;
type PromptVersion = typeof translationPromptVersions.$inferSelect;

export type AiStageEvent = {
  stage: AutomaticTranslationTask;
  label: string;
  modelName: string;
};

export type AiCallRecord = {
  task: AutomaticTranslationTask;
  model: AiModel;
  result: StructuredAiResult;
};

const analysisSchema = z.object({
  genre: z.string().min(1).max(200),
  subgenres: z.array(z.string().min(1).max(160)).max(10),
  tone: z.string().min(1).max(2_000),
  narrativeVoice: z.string().min(1).max(2_000),
  terminologyRisks: z.array(z.string().min(1).max(500)).max(30),
  translationStrategy: z.string().min(1).max(5_000),
  masterRouting: z.object({
    baseProfileId: z.string().min(1).max(40).nullable(),
    overlayProfileIds: z.array(z.string().min(1).max(40)).max(4),
    recipeId: z.string().min(1).max(40).nullable(),
    confidence: z.number().int().min(0).max(100),
    reason: z.string().min(1).max(2_000),
    sourceSignals: z.array(z.string().min(1).max(500)).max(8),
  }),
});

const foundationSchema = z.object({
  name: z.string().min(1).max(160),
  styleGuide: z.string().min(1).max(20_000),
  instructions: z.string().min(1).max(20_000),
  preserveParagraphs: z.boolean(),
  translatedTitle: z.string().min(1).max(1_000),
  translatedSynopsis: z.string().min(1).max(20_000).nullable(),
});

const profileQualitySchema = foundationSchema.extend({
  reviewNotes: z.array(z.string().min(1).max(1_000)).max(30),
});

const entitiesSchema = z.object({
  glossary: z.array(z.object({
    sourceTerm: z.string().min(1).max(300),
    targetTerm: z.string().min(1).max(300),
    note: z.string().max(1_000).nullable(),
  })).max(100),
  characters: z.array(z.object({
    sourceName: z.string().min(1).max(300),
    targetName: z.string().min(1).max(300),
    aliases: z.array(z.string().min(1).max(300)).max(30),
    description: z.string().max(3_000).nullable(),
    speakingStyle: z.string().max(3_000).nullable(),
  })).max(100),
});

const aiProfileResultMetricsSchema = z.object({
  providerRequestId: z.string().nullable(),
  inputTokens: z.number().int().nonnegative(),
  promptCacheEnabled: z.boolean(),
  cachedInputTokens: z.number().int().nonnegative(),
  cacheWriteInputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
});

export const aiProfileGenerationCheckpointSchema = z.object({
  version: z.literal(1),
  signature: z.string().min(1),
  analysis: z.object({ value: analysisSchema, result: aiProfileResultMetricsSchema }).optional(),
  foundation: z.object({ value: foundationSchema, result: aiProfileResultMetricsSchema }).optional(),
  qualityReview: z.object({ value: profileQualitySchema, result: aiProfileResultMetricsSchema }).optional(),
  entities: z.object({ value: entitiesSchema, result: aiProfileResultMetricsSchema }).optional(),
});

export type AiProfileGenerationCheckpoint = z.infer<typeof aiProfileGenerationCheckpointSchema>;

const chapterAnalysisSchema = z.object({
  summary: z.string().min(1).max(8_000),
  continuityFacts: z.array(z.string().min(1).max(1_000)).max(50),
  entities: z.array(z.string().min(1).max(300)).max(100),
  glossaryCandidates: z.array(z.object({
    sourceTerm: z.string().min(1).max(300),
    targetTerm: z.string().min(1).max(300),
    note: z.string().max(1_000).nullable(),
    confidence: z.number().int().min(0).max(100),
  })).max(100),
  difficulty: z.enum(["NORMAL", "HARD"]),
  translationNotes: z.array(z.string().min(1).max(1_000)).max(50),
});

const titleReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["NATURAL", "NEEDS_REVISION"]),
  issues: z.array(z.string().min(1).max(1_000)).max(20),
  recommendedTitle: z.string().min(1).max(1_000),
  candidates: z.array(z.object({
    title: z.string().min(1).max(1_000),
    rationale: z.string().min(1).max(2_000),
  })).min(1).max(5),
});

const qaSchema = z.object({
  passed: z.boolean(),
  score: z.number().int().min(0).max(100),
  issues: z.array(z.object({
    code: z.string().min(1).max(80),
    severity: z.enum(["INFO", "WARNING", "CRITICAL"]),
    message: z.string().min(1).max(2_000),
    location: z.enum(["TITLE", "CONTENT"]).nullable(),
    currentText: z.string().max(4_000).nullable(),
    suggestedText: z.string().max(4_000).nullable(),
  })).max(100),
  correctionInstructions: z.array(z.string().min(1).max(1_000)).max(50),
});

const translationSchema = z.object({ title: z.string().min(1).max(1_000), content: z.string().min(1).max(2_000_000) });

const chapterTranslationSchema = z.object({
  translation: translationSchema,
  chapterAnalysis: chapterAnalysisSchema,
});

const translationPatchSchema = z.object({
  patches: z.array(z.object({
    location: z.enum(["TITLE", "CONTENT"]),
    currentText: z.string().min(1).max(4_000),
    replacementText: z.string().max(4_000),
    reason: z.string().min(1).max(1_000),
  })).max(40),
  requiresFullRewrite: z.boolean(),
  rationale: z.string().min(1).max(2_000),
});

const PROFILE_SYSTEM_PROMPT = `You design production translation profiles for serialized fiction.
Analyze the supplied title, synopsis, and bounded opening-chapter samples. Never invent plot facts. Produce actionable guidance in the target language.
Translate the novel title and complete synopsis faithfully into the requested target language. Preserve names according to the profile strategy and do not summarize, omit, or add story details.
Names, terms, and character suggestions must be grounded in the supplied source material. Treat genre context as editorial guidance, never as story facts. Do not imitate a named author, translator, or copyrighted work; apply only general editorial mechanisms. Return only the requested structured output.`;

const PROFILE_ANALYSIS_SYSTEM_PROMPT = `${PROFILE_SYSTEM_PROMPT}
When a translationMasterCatalog is supplied, propose exactly one BASE_GENRE profile and only overlays explicitly supported by the title, synopsis, or chapter samples. Use activation conditions, not popularity, cover assumptions, or stereotypes. Select IDs only from the catalog. Select a recipe only when its base and every required overlay match your proposal. Use the neutral G000 base when evidence is insufficient. Quote only short source signals and provide a calibrated confidence from 0 to 100. The server will validate all proposed IDs and compatibility before use.`;

const PROFILE_QUALITY_REVIEW_PROMPT = `You are the final senior localization editor for a production serialized-fiction profile.
Audit the draft title, synopsis, style guide, and instructions against the source metadata, chapter samples, analysis, and selected genre context.
Rewrite the complete draft wherever it sounds literal, stiff, generic, culturally unnatural, or inconsistent with the source voice. The target-language result must read as native commercial fiction while preserving every supported fact.
For Thai: explicitly check modifier order, pronouns, particles, dialogue register, genre terminology, title naturalness, and translationese. Do not invent story details or lock uncertain names.
Return the complete revised foundation plus concise reviewNotes. Return only the requested structured output.`;

const PROFILE_ENTITY_EXTRACTION_PROMPT = `${PROFILE_SYSTEM_PROMPT}
Extract glossary entries only for proper names, ranks, places, techniques, objects, and recurring coined terms that require consistency across chapters.
Do not add ordinary vocabulary or a short polysemous word such as "gate", "name", or "human". Use the complete disambiguating source phrase instead, such as "summoning gate".
Keep distinct source forms distinct: for example, never use "viscount" as the entry for "viscountess". When the same source concept legitimately permits multiple target-language surface forms, separate the target alternatives with " / ".
Glossary output is advisory until a human editor locks it. Notes must state the exact sense and context. Return only the requested structured output.`;

const CHAPTER_ANALYSIS_PROMPT = `You are a continuity analyst for serialized-fiction translation.
Analyze the complete source chapter faithfully. Identify canon, entities, difficulty, and translation risks without adding facts.
Extract only reusable names, ranks, places, techniques, objects, and recurring coined terms as glossaryCandidates. Suggest a target-language rendering grounded in context and attach a calibrated confidence score. Do not add ordinary vocabulary.
Keep the result compact: include only facts and terms that materially help translate this chapter or preserve continuity in later chapters. Merge duplicates instead of restating the same fact.
Return only the requested structured output.`;

const QA_SYSTEM_PROMPT = `You are a rigorous bilingual QA editor for serialized fiction.
Compare the complete source and translation for omissions, additions, mistranslations, name inconsistency, tone, and paragraph integrity.
Treat context.glossary as binding editor-approved terminology. Treat context.suggestedGlossary as advisory terminology learned from prior chapters: preserve it when the source meaning and current context match, but never let it override the source or a binding glossary entry.
For every actionable issue, include an exact currentText excerpt from the supplied translation and a complete suggestedText replacement. Set location to TITLE or CONTENT. Use null for these fields only when an exact safe replacement is impossible.
Mark passed=false when revision is required. Return only the requested structured output.`;

const PATCH_EDITOR_SYSTEM_PROMPT = `You are a precise bilingual copy editor for serialized fiction.
Resolve only the supplied QA findings. Return the smallest possible set of exact text replacements; never return the complete chapter.
Each currentText must be copied exactly from the supplied translation and identify one unique occurrence. replacementText may be empty only to remove text that was added without source support.
Preserve unaffected prose, paragraph boundaries, locked glossary choices, names, voice, and chronology.
Set requiresFullRewrite=true only when omissions or structural corruption cannot be repaired safely with local replacements. Return only the requested structured output.`;

const TITLE_REVIEW_SYSTEM_PROMPT = `You are a senior fiction-title editor specializing in the requested target language.
Review the translated novel title against the source title, synopsis, genre, tone, and translation profile.
Prioritize a natural, memorable target-language title that sounds locally published. Apply native genre conventions; when the target is Thai, explicitly reject stiff word-for-word syntax and unnatural abstract-noun compounds. Avoid invented plot facts and meaning drift.
Return 3 to 5 distinct usable candidates, select the strongest recommendation, and explain concrete language issues concisely. Return only the requested structured output.`;

function jsonObject(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, properties, required };
}

const stringArray = { type: "array", items: { type: "string" } };

function boundedStringArray(maxItems: number, minItems?: number) {
  return {
    ...stringArray,
    ...(minItems === undefined ? {} : { minItems }),
    maxItems,
  };
}

async function structured<T>(input: {
  model: AiModel;
  task: AutomaticTranslationTask;
  systemPrompt: string;
  payload: Record<string, unknown>;
  cache?: PromptCacheInput;
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  parser: z.ZodType<T>;
  timeoutMs?: number;
}) {
  const result = await getTranslationProvider(input.model.provider).generateStructured(input);
  return { value: input.parser.parse(result.output), call: { task: input.task, model: input.model, result } satisfies AiCallRecord };
}

export async function generateAiTranslationProfile(input: {
  title: string;
  synopsis: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  samples: Array<{ chapterNumber: number; title: string | null; content: string }>;
  masterBundle: TranslationMasterBundle;
  models: Record<"PROFILE_ANALYSIS" | "FOUNDATION" | "PROFILE_QUALITY_REVIEW" | "ENTITY_EXTRACTION", AiModel>;
  checkpoint?: unknown;
  checkpointSignature: string;
  onCheckpoint?: (checkpoint: AiProfileGenerationCheckpoint) => void | Promise<void>;
  onStage?: (event: AiStageEvent) => void | Promise<void>;
}) {
  const source = { title: input.title, synopsis: input.synopsis?.trim() || null, sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage };
  const masterCatalog = buildTranslationMasterRoutingCatalog(input.masterBundle);
  const samples = input.samples.slice(0, 3).map((sample) => ({
    chapterNumber: sample.chapterNumber,
    title: sample.title?.trim() || null,
    content: sample.content.length <= 10_000
      ? sample.content
      : `${sample.content.slice(0, 7_500)}\n\n[…bounded sample…]\n\n${sample.content.slice(-2_500)}`,
  }));
  const parsedCheckpoint = aiProfileGenerationCheckpointSchema.safeParse(input.checkpoint);
  let checkpoint: AiProfileGenerationCheckpoint = parsedCheckpoint.success && parsedCheckpoint.data.signature === input.checkpointSignature
    ? parsedCheckpoint.data
    : { version: 1, signature: input.checkpointSignature };
  const storeCheckpoint = async (next: AiProfileGenerationCheckpoint) => {
    checkpoint = next;
    await input.onCheckpoint?.(checkpoint);
  };
  const checkpointMetrics = (result: StructuredAiResult) => ({
    providerRequestId: result.providerRequestId,
    inputTokens: result.inputTokens,
    promptCacheEnabled: result.promptCacheEnabled,
    cachedInputTokens: result.cachedInputTokens,
    cacheWriteInputTokens: result.cacheWriteInputTokens,
    outputTokens: result.outputTokens,
    latencyMs: result.latencyMs,
  });
  await input.onStage?.({ stage: "PROFILE_ANALYSIS", label: checkpoint.analysis ? "ใช้ผลวิเคราะห์เรื่องจาก Checkpoint" : "AI กำลังวิเคราะห์เรื่องและเลือก Translation Master", modelName: input.models.PROFILE_ANALYSIS.modelName });
  const analysis = checkpoint.analysis ? {
    value: checkpoint.analysis.value,
    call: {
      task: "PROFILE_ANALYSIS" as const,
      model: input.models.PROFILE_ANALYSIS,
      result: { ...checkpoint.analysis.result, output: checkpoint.analysis.value },
    },
  } : await structured({
    model: input.models.PROFILE_ANALYSIS,
    task: "PROFILE_ANALYSIS",
    systemPrompt: PROFILE_ANALYSIS_SYSTEM_PROMPT,
    payload: { source, openingChapterSamples: samples, translationMasterCatalog: masterCatalog },
    schemaName: "novel_profile_analysis",
    jsonSchema: jsonObject({
      genre: { type: "string" }, subgenres: boundedStringArray(10), tone: { type: "string" }, narrativeVoice: { type: "string" },
      terminologyRisks: boundedStringArray(30), translationStrategy: { type: "string" },
      masterRouting: jsonObject({
        baseProfileId: { type: ["string", "null"] },
        overlayProfileIds: boundedStringArray(4),
        recipeId: { type: ["string", "null"] },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        reason: { type: "string" },
        sourceSignals: boundedStringArray(8),
      }),
    }),
    parser: analysisSchema,
  });
  if (!checkpoint.analysis) {
    await storeCheckpoint({ ...checkpoint, analysis: { value: analysis.value, result: checkpointMetrics(analysis.call.result) } });
  }
  const legacyGenreContext = selectTranslationGenreContext({
    genre: analysis.value.genre,
    subgenres: analysis.value.subgenres,
    tone: analysis.value.tone,
    targetLanguage: input.targetLanguage,
  });
  const masterGenreContext = selectTranslationMasterContext(input.masterBundle, analysis.value, analysis.value.masterRouting);
  const masterSelection: TranslationMasterSelection = masterGenreContext?.selection ?? {
    mode: "LEGACY_FALLBACK",
    routing: { method: "LEGACY_FALLBACK", confidence: null, reason: "No approved active genre master was available.", sourceSignals: [] },
    baseProfile: null,
    overlays: [],
    recipe: null,
    sceneCandidates: [],
    globalRuleVersions: [],
  };
  const genreContext = masterGenreContext ?? legacyGenreContext;

  await input.onStage?.({ stage: "FOUNDATION", label: checkpoint.foundation ? "ใช้ Style guide จาก Checkpoint" : `AI กำลังสร้าง Style guide สำหรับแนว ${genreContext.label}`, modelName: input.models.FOUNDATION.modelName });
  const foundation = checkpoint.foundation ? {
    value: checkpoint.foundation.value,
    call: {
      task: "FOUNDATION" as const,
      model: input.models.FOUNDATION,
      result: { ...checkpoint.foundation.result, output: checkpoint.foundation.value },
    },
  } : await structured({
    model: input.models.FOUNDATION,
    task: "FOUNDATION",
    systemPrompt: PROFILE_SYSTEM_PROMPT,
    payload: { source, openingChapterSamples: samples, analysis: analysis.value, genreContext },
    schemaName: "novel_translation_foundation",
    jsonSchema: jsonObject({
      name: { type: "string" },
      styleGuide: { type: "string" },
      instructions: { type: "string" },
      preserveParagraphs: { type: "boolean" },
      translatedTitle: { type: "string" },
      translatedSynopsis: { type: ["string", "null"] },
    }),
    parser: foundationSchema,
  });
  if (!checkpoint.foundation) {
    await storeCheckpoint({ ...checkpoint, foundation: { value: foundation.value, result: checkpointMetrics(foundation.call.result) } });
  }

  await input.onStage?.({ stage: "PROFILE_QUALITY_REVIEW", label: checkpoint.qualityReview ? "ใช้ผลตรวจ Profile จาก Checkpoint" : "บรรณาธิการ AI กำลังแก้สำนวนทื่อและตรวจความเป็นธรรมชาติ", modelName: input.models.PROFILE_QUALITY_REVIEW.modelName });
  const qualityReview = checkpoint.qualityReview ? {
    value: checkpoint.qualityReview.value,
    call: {
      task: "PROFILE_QUALITY_REVIEW" as const,
      model: input.models.PROFILE_QUALITY_REVIEW,
      result: { ...checkpoint.qualityReview.result, output: checkpoint.qualityReview.value },
    },
  } : await structured({
    model: input.models.PROFILE_QUALITY_REVIEW,
    task: "PROFILE_QUALITY_REVIEW",
    systemPrompt: PROFILE_QUALITY_REVIEW_PROMPT,
    payload: { source, openingChapterSamples: samples, analysis: analysis.value, genreContext, draft: foundation.value },
    schemaName: "novel_profile_quality_review",
    jsonSchema: jsonObject({
      name: { type: "string" },
      styleGuide: { type: "string" },
      instructions: { type: "string" },
      preserveParagraphs: { type: "boolean" },
      translatedTitle: { type: "string" },
      translatedSynopsis: { type: ["string", "null"] },
      reviewNotes: boundedStringArray(30),
    }),
    parser: profileQualitySchema,
  });
  if (!checkpoint.qualityReview) {
    await storeCheckpoint({ ...checkpoint, qualityReview: { value: qualityReview.value, result: checkpointMetrics(qualityReview.call.result) } });
  }

  await input.onStage?.({ stage: "ENTITY_EXTRACTION", label: checkpoint.entities ? "ใช้รายชื่อและคำศัพท์จาก Checkpoint" : "AI กำลังสกัดชื่อ ตัวละคร และศัพท์เริ่มต้น", modelName: input.models.ENTITY_EXTRACTION.modelName });
  const entities = checkpoint.entities ? {
    value: checkpoint.entities.value,
    call: {
      task: "ENTITY_EXTRACTION" as const,
      model: input.models.ENTITY_EXTRACTION,
      result: { ...checkpoint.entities.result, output: checkpoint.entities.value },
    },
  } : await structured({
    model: input.models.ENTITY_EXTRACTION,
    task: "ENTITY_EXTRACTION",
    systemPrompt: PROFILE_ENTITY_EXTRACTION_PROMPT,
    payload: { source, openingChapterSamples: samples, analysis: analysis.value, genreContext, approvedFoundation: qualityReview.value },
    schemaName: "novel_profile_entities",
    jsonSchema: jsonObject({
      glossary: { type: "array", maxItems: 100, items: jsonObject({ sourceTerm: { type: "string" }, targetTerm: { type: "string" }, note: { type: ["string", "null"] } }) },
      characters: { type: "array", maxItems: 100, items: jsonObject({ sourceName: { type: "string" }, targetName: { type: "string" }, aliases: boundedStringArray(30), description: { type: ["string", "null"] }, speakingStyle: { type: ["string", "null"] } }) },
    }),
    parser: entitiesSchema,
  });
  if (!checkpoint.entities) {
    await storeCheckpoint({ ...checkpoint, entities: { value: entities.value, result: checkpointMetrics(entities.call.result) } });
  }

  const { translatedTitle, translatedSynopsis, reviewNotes, ...profile } = qualityReview.value;
  return {
    profile,
    metadata: { title: translatedTitle.trim(), synopsis: translatedSynopsis?.trim() || null },
    analysis: { ...analysis.value, genreContext: { key: genreContext.key, label: genreContext.label, guidance: genreContext.guidance }, masterSelection, profileReviewNotes: reviewNotes, sampledChapters: samples.map((sample) => sample.chapterNumber) },
    ...entities.value,
    calls: [analysis.call, foundation.call, qualityReview.call, entities.call],
  };
}

export async function analyzeChapterWithAi(input: {
  model: AiModel;
  sourceTitle: string;
  sourceContent: string;
  context: Record<string, unknown>;
  cache?: PromptCacheInput;
}) {
  return structured({
    model: input.model,
    task: "CANON_EXTRACTION",
    systemPrompt: CHAPTER_ANALYSIS_PROMPT,
    cache: input.cache,
    payload: { context: input.context, source: { title: input.sourceTitle, content: input.sourceContent } },
    schemaName: "chapter_canon_analysis",
    jsonSchema: jsonObject({
      summary: { type: "string" },
      continuityFacts: boundedStringArray(24),
      entities: boundedStringArray(40),
      glossaryCandidates: {
        type: "array",
        maxItems: 30,
        items: jsonObject({
          sourceTerm: { type: "string" },
          targetTerm: { type: "string" },
          note: { type: ["string", "null"] },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
        }),
      },
      difficulty: { type: "string", enum: ["NORMAL", "HARD"] },
      translationNotes: boundedStringArray(20),
    }),
    parser: chapterAnalysisSchema,
  });
}

/** One production call returns the complete translation plus compact canon data. */
export async function translateChapterWithCanonAi(input: {
  model: AiModel;
  prompt: PromptVersion;
  sourceTitle: string;
  sourceContent: string;
  context: Record<string, unknown>;
  cache?: PromptCacheInput;
}) {
  return structured({
    model: input.model,
    task: "MAIN_TRANSLATION",
    systemPrompt: `${input.prompt.systemPrompt}\nTreat context.glossary as binding editor-approved terminology. Treat context.suggestedGlossary as advisory terminology learned from prior chapters: prefer it when the source meaning and current context match, but never let it override the source or a binding glossary entry.\nTranslate the complete chapter and, in the same response, return a compact canon analysis grounded only in the source. Keep canon fields concise so translation quality remains the priority.`,
    cache: input.cache,
    payload: { context: input.context, source: { title: input.sourceTitle, content: input.sourceContent } },
    schemaName: "novel_translation_with_canon",
    jsonSchema: jsonObject({
      translation: jsonObject({ title: { type: "string" }, content: { type: "string" } }),
      chapterAnalysis: jsonObject({
        summary: { type: "string" },
        continuityFacts: boundedStringArray(24),
        entities: boundedStringArray(40),
        glossaryCandidates: {
          type: "array",
          maxItems: 30,
          items: jsonObject({
            sourceTerm: { type: "string" },
            targetTerm: { type: "string" },
            note: { type: ["string", "null"] },
            confidence: { type: "integer", minimum: 0, maximum: 100 },
          }),
        },
        difficulty: { type: "string", enum: ["NORMAL", "HARD"] },
        translationNotes: boundedStringArray(20),
      }),
    }),
    parser: chapterTranslationSchema,
  });
}

export async function reviewNovelTitleWithAi(input: {
  model: AiModel;
  sourceTitle: string;
  sourceSynopsis: string | null;
  translatedTitle: string;
  translatedSynopsis: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  profile: { styleGuide: string; instructions: string } | null;
}) {
  return structured({
    model: input.model,
    task: "FOUNDATION",
    systemPrompt: TITLE_REVIEW_SYSTEM_PROMPT,
    payload: {
      languages: { source: input.sourceLanguage, target: input.targetLanguage },
      source: { title: input.sourceTitle, synopsis: input.sourceSynopsis },
      translation: { title: input.translatedTitle, synopsis: input.translatedSynopsis },
      profile: input.profile,
    },
    schemaName: "novel_title_review",
    jsonSchema: jsonObject({
      score: { type: "integer", minimum: 0, maximum: 100 },
      verdict: { type: "string", enum: ["NATURAL", "NEEDS_REVISION"] },
      issues: boundedStringArray(20),
      recommendedTitle: { type: "string" },
      candidates: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: jsonObject({ title: { type: "string" }, rationale: { type: "string" } }),
      },
    }),
    parser: titleReviewSchema,
    timeoutMs: 75_000,
  });
}

export async function qaTranslationWithAi(input: {
  model: AiModel;
  sourceTitle: string;
  sourceContent: string;
  translatedTitle: string;
  translatedContent: string;
  context: Record<string, unknown>;
  cache?: PromptCacheInput;
}) {
  return structured({
    model: input.model,
    task: "FIRST_QA",
    systemPrompt: QA_SYSTEM_PROMPT,
    cache: input.cache,
    payload: {
      context: input.context,
      source: { title: input.sourceTitle, content: input.sourceContent },
      translation: { title: input.translatedTitle, content: input.translatedContent },
    },
    schemaName: "translation_qa",
    jsonSchema: jsonObject({
      passed: { type: "boolean" }, score: { type: "integer", minimum: 0, maximum: 100 },
      issues: {
        type: "array",
        maxItems: 100,
        items: jsonObject({
          code: { type: "string" },
          severity: { type: "string", enum: ["INFO", "WARNING", "CRITICAL"] },
          message: { type: "string" },
          location: { type: ["string", "null"], enum: ["TITLE", "CONTENT", null] },
          currentText: { type: ["string", "null"] },
          suggestedText: { type: ["string", "null"] },
        }),
      },
      correctionInstructions: boundedStringArray(50),
    }),
    parser: qaSchema,
  });
}

export async function reviseTranslationWithPatchesAi(input: {
  model: AiModel;
  sourceTitle: string;
  sourceContent: string;
  translatedTitle: string;
  translatedContent: string;
  context: Record<string, unknown>;
  qa: z.infer<typeof qaSchema>;
  cache?: PromptCacheInput;
}) {
  return structured({
    model: input.model,
    task: "ESCALATION",
    systemPrompt: PATCH_EDITOR_SYSTEM_PROMPT,
    cache: input.cache,
    payload: {
      context: input.context,
      source: { title: input.sourceTitle, content: input.sourceContent },
      translation: { title: input.translatedTitle, content: input.translatedContent },
      qa: input.qa,
    },
    schemaName: "translation_correction_patches",
    jsonSchema: jsonObject({
      patches: {
        type: "array",
        maxItems: 40,
        items: jsonObject({
          location: { type: "string", enum: ["TITLE", "CONTENT"] },
          currentText: { type: "string" },
          replacementText: { type: "string" },
          reason: { type: "string" },
        }),
      },
      requiresFullRewrite: { type: "boolean" },
      rationale: { type: "string" },
    }),
    parser: translationPatchSchema,
  });
}

export async function reviseTranslationWithAi(input: {
  model: AiModel;
  prompt: PromptVersion;
  sourceTitle: string;
  sourceContent: string;
  translatedTitle: string;
  translatedContent: string;
  context: Record<string, unknown>;
  qa: z.infer<typeof qaSchema>;
  cache?: PromptCacheInput;
}) {
  return structured({
    model: input.model,
    task: "ESCALATION",
    systemPrompt: `${input.prompt.systemPrompt}\nRevise the supplied translation to resolve every QA issue. Return the complete corrected chapter, not a patch.`,
    cache: input.cache,
    payload: {
      context: input.context,
      source: { title: input.sourceTitle, content: input.sourceContent },
      translation: { title: input.translatedTitle, content: input.translatedContent },
      qa: input.qa,
    },
    schemaName: "revised_novel_translation",
    jsonSchema: jsonObject({ title: { type: "string" }, content: { type: "string" } }),
    parser: translationSchema,
  });
}

type AiUsageResult = Pick<StructuredAiResult, "inputTokens" | "cachedInputTokens" | "cacheWriteInputTokens" | "outputTokens">;

export function aiUsageCostMicros(model: AiModel, result: AiUsageResult) {
  const supportsModernCachePricing = /^gpt-(?:5\.(?:[6-9]|\d{2,})|[6-9](?:\.|-|$))/i.test(model.modelName);
  const cachedInputTokens = supportsModernCachePricing
    ? Math.min(result.inputTokens, Math.max(0, result.cachedInputTokens))
    : 0;
  const cacheWriteInputTokens = supportsModernCachePricing
    ? Math.min(result.inputTokens - cachedInputTokens, Math.max(0, result.cacheWriteInputTokens))
    : 0;
  const uncachedInputTokens = result.inputTokens - cachedInputTokens - cacheWriteInputTokens;
  const inputCost = Number(model.inputCostMicrosPerMillion);
  return Math.round((
    uncachedInputTokens * inputCost
    + cachedInputTokens * inputCost * 0.1
    + cacheWriteInputTokens * inputCost * 1.25
    + result.outputTokens * Number(model.outputCostMicrosPerMillion)
  ) / 1_000_000);
}

export function aiCallCostMicros(call: AiCallRecord) {
  return aiUsageCostMicros(call.model, call.result);
}
