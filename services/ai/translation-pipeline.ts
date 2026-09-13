import "server-only";

import { z } from "zod";

import type { translationAiModels, translationPromptVersions } from "@/db/schema";
import {
  THAI_NOVEL_LOCALIZATION_RULES,
  withThaiNovelLocalizationRules,
  type AutomaticTranslationTask,
} from "@/lib/domain/translation-ai-routing";
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

const metadataReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  synopsisScore: z.number().int().min(0).max(100),
  fidelityScore: z.number().int().min(0).max(100),
  verdict: z.enum(["NATURAL", "NEEDS_REVISION"]),
  issues: z.array(z.string().min(1).max(1_000)).max(20),
  recommendedTitle: z.string().min(1).max(1_000),
  recommendedSynopsis: z.string().min(1).max(20_000).nullable(),
  candidates: z.array(z.object({
    title: z.string().min(1).max(1_000),
    rationale: z.string().min(1).max(2_000),
  })).min(1).max(5),
});

const aiProfileResultMetricsSchema = z.object({
  providerRequestId: z.string().nullable(),
  serviceTier: z.string().max(32).nullable().optional(),
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
  metadataReview: z.object({ value: metadataReviewSchema, result: aiProfileResultMetricsSchema }).optional(),
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

const METADATA_LOCALIZATION_SYSTEM_PROMPT = `You are the final bilingual metadata editor for commercially published serialized fiction.
The source title and synopsis are authoritative. Rewrite the supplied translated title and complete synopsis so they read as native publishing copy in the requested target language while preserving every supported fact, relationship, age, condition, event, promise, uncertainty, and genre signal. Never add, remove, summarize, soften, intensify, diagnose, or reinterpret a factual claim.
The synopsis must attract readers through clear rhythm and paragraph progression, not invented hype. Remove source-language syntax, repetitive explicit subjects, generic filler, redundant modifiers, and literal collocations. Keep deliberate suspense and end on the strongest source-supported hook. Preserve meaningful paragraph order, but split dense copy at natural premise, turn, and hook boundaries.
For Thai, write polished contemporary Thai fiction copy. Rebuild clauses and sentence rhythm instead of swapping isolated words. Prefer natural clause order and selective subject omission. Do not repeat a character name or pronoun merely because the source language requires a subject. A faithful localization preserves the intended premise and stakes, not an obviously loose category label: for example, describe Rh-null neutrally as a rare blood type or condition rather than claiming the blood type itself is an incurable disease, unless an actual separate illness is plot-critical.
Reject awkward constructions including “คอยช่วยให้เขาดูแลตัวเอง”, “นั่นคือ…”, “สิ่งมีชีวิตซึ่งกินเลือดชื่นชอบ”, “อาหารชั้นเลิศที่เหล่าผู้ดื่มเลือดต่างโปรดปราน”, “เป็นของโอชะ”, and mechanical repetition of “เขา”. Avoid generic labels such as “ผู้ดื่มเลือด” when the genre supports a natural collective phrase. Prefer concise native constructions such as “ครอบครัวที่คอยดูแลเขาอย่างใกล้ชิด” and context-appropriate phrasing such as “เลือดของเขากลับเป็นโอชารสอันล้ำค่าที่เหล่าอมนุษย์ผู้กระหายโลหิตต่างหมายปอง” without adding a plot fact. For a short premise-turn-hook synopsis, use distinct paragraphs for the human premise, supernatural turn, and final hook. Use exactly one blank line between paragraphs and no markdown.
When focus is SYNOPSIS, keep recommendedTitle exactly equal to the supplied translated title and return that title as the sole candidate; spend the editorial effort on the synopsis.
Score title naturalness, synopsis naturalness, and factual fidelity independently from 0 to 100. Silently revise the recommended output until synopsis naturalness is at least 90 and fidelity is at least 95; report a lower score only when the supplied source is missing or internally contradictory. Set verdict to NEEDS_REVISION when either naturalness score is below 85 or fidelity is below 95. Return the complete recommended synopsis, not notes or a shortened summary. If the source synopsis is non-null but the translated synopsis is null, create the complete target-language synopsis from the source; never return null merely because the draft is missing. Preserve adult-content warnings and sensitive genre signals in concise non-graphic publishing language. Return null only when the source itself has no synopsis. Return only the requested structured output.`;

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
${THAI_NOVEL_LOCALIZATION_RULES}
For Thai translations, natural idiomatic prose is a release-quality requirement, not optional polish. Flag literal English syntax, missed idiomatic rendering, excessive explicit pronouns, repetitive sentence openings, unnatural dialogue, and stiff narration. When these problems recur or materially interrupt reading flow, set passed=false and assign a score below quality.minimumScore even if the facts are accurate. Use code THAI_TRANSLATIONESE and provide exact, context-safe replacements whenever possible.
Also flag a Thai paragraph over 260 characters when it contains multiple sentences or narrative beats, dense shorter paragraphs that still combine several distinct beats, and choppy formatting that isolates nearly every sentence. Use code THAI_PARAGRAPH_FLOW. A good correction may add or remove a blank line, but must not reorder, omit, duplicate, or invent text. Allow a longer single uninterrupted quotation, letter, system message, or deliberate monologue.
Treat context.glossary as binding editor-approved terminology. Treat context.suggestedGlossary as advisory terminology learned from prior chapters: preserve it when the source meaning and current context match, but never let it override the source or a binding glossary entry.
For each binding glossary mismatch, locate the exact source occurrence and its corresponding translated paragraph. Use code LOCKED_GLOSSARY_MISSING, copy the smallest unique mistranslated currentText exactly, and provide a complete suggestedText replacement that uses an allowed binding term. Never match a glossary source term inside a longer word.
For every actionable issue, include an exact currentText excerpt from the supplied translation and a complete suggestedText replacement. Set location to TITLE or CONTENT. Use null for these fields only when an exact safe replacement is impossible.
Mark passed=false when revision is required. Return only the requested structured output.`;

const PATCH_EDITOR_SYSTEM_PROMPT = `You are a precise bilingual copy editor for serialized fiction.
Resolve only the supplied QA findings. Return the smallest possible set of exact text replacements; never return the complete chapter.
${THAI_NOVEL_LOCALIZATION_RULES}
For THAI_TRANSLATIONESE findings, replace the complete affected sentence or short passage when a word-level substitution would leave English syntax behind.
Each currentText must be copied exactly from the supplied translation and identify one unique occurrence. replacementText may be empty only to remove text that was added without source support.
Preserve unaffected prose, paragraph order, locked glossary choices, names, voice, and chronology. For THAI_PARAGRAPH_FLOW, a replacement may split a dense passage or recombine choppy fragments only at a natural narrative boundary.
Set requiresFullRewrite=true only when omissions or structural corruption cannot be repaired safely with local replacements. Return only the requested structured output.`;

const POLISH_SYSTEM_PROMPT = withThaiNovelLocalizationRules(`You are a senior bilingual fiction editor polishing an existing complete translation.
Treat source as authoritative and currentTranslation as the base manuscript. Rewrite the complete translated title and content so they read as native, engaging commercial fiction in the requested target language.
Preserve every supported fact, speaker, action, relationship, chronology, paragraph order, locked term, character voice, and deliberate repetition. Improve sentence rhythm, idiomatic expression, dialogue flow, collocations, narration, and mobile paragraph flow throughout; do not merely make isolated word substitutions. Never merge separate source paragraphs, but split an overly dense paragraph at a natural narrative beat when that improves Thai readability.
Do not summarize, censor, add events, intensify romance or violence, explain your work, or include markdown fences.
Return the complete polished translation plus a compact canon analysis grounded only in the source. Return only the requested structured output.`);

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
  serviceTier?: "auto" | "default" | "flex";
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
  models: Record<"PROFILE_ANALYSIS" | "FOUNDATION" | "PROFILE_QUALITY_REVIEW" | "METADATA_LOCALIZATION" | "ENTITY_EXTRACTION", AiModel>;
  checkpoint?: unknown;
  checkpointSignature: string;
  onCheckpoint?: (checkpoint: AiProfileGenerationCheckpoint) => void | Promise<void>;
  onStage?: (event: AiStageEvent) => void | Promise<void>;
}) {
  // Profile creation runs inside a streamed admin request. Keep these few
  // setup calls on Standard so a slow Flex call cannot exhaust that route;
  // queued chapter and backfill work still defaults to Flex.
  const serviceTier = "default" as const;
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
    serviceTier: result.serviceTier ?? null,
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
    serviceTier,
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
    serviceTier,
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
    serviceTier,
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

  await input.onStage?.({ stage: "METADATA_LOCALIZATION", label: checkpoint.metadataReview ? "ใช้ผลเกลาชื่อและเรื่องย่อจากจุดที่บันทึกไว้" : "บรรณาธิการ AI กำลังเกลาชื่อและเรื่องย่อ", modelName: input.models.METADATA_LOCALIZATION.modelName });
  const metadataReview = checkpoint.metadataReview ? {
    value: checkpoint.metadataReview.value,
    call: {
      task: "METADATA_LOCALIZATION" as const,
      model: input.models.METADATA_LOCALIZATION,
      result: { ...checkpoint.metadataReview.result, output: checkpoint.metadataReview.value },
    },
  } : await reviewNovelMetadataWithAi({
    model: input.models.METADATA_LOCALIZATION,
    serviceTier,
    sourceTitle: input.title,
    sourceSynopsis: input.synopsis,
    translatedTitle: qualityReview.value.translatedTitle,
    translatedSynopsis: qualityReview.value.translatedSynopsis,
    sourceLanguage: input.sourceLanguage,
    targetLanguage: input.targetLanguage,
    profile: { styleGuide: qualityReview.value.styleGuide, instructions: qualityReview.value.instructions },
  });
  if (!checkpoint.metadataReview) {
    await storeCheckpoint({ ...checkpoint, metadataReview: { value: metadataReview.value, result: checkpointMetrics(metadataReview.call.result) } });
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
    serviceTier,
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

  const { reviewNotes } = qualityReview.value;
  const profile = {
    name: qualityReview.value.name,
    styleGuide: qualityReview.value.styleGuide,
    instructions: qualityReview.value.instructions,
    preserveParagraphs: qualityReview.value.preserveParagraphs,
  };
  return {
    profile,
    metadata: { title: metadataReview.value.recommendedTitle.trim(), synopsis: metadataReview.value.recommendedSynopsis?.trim() || null },
    analysis: { ...analysis.value, genreContext: { key: genreContext.key, label: genreContext.label, guidance: genreContext.guidance }, masterSelection, profileReviewNotes: reviewNotes, sampledChapters: samples.map((sample) => sample.chapterNumber) },
    ...entities.value,
    calls: [analysis.call, foundation.call, qualityReview.call, metadataReview.call, entities.call],
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
    systemPrompt: withThaiNovelLocalizationRules(`${input.prompt.systemPrompt}\nTreat context.glossary as binding editor-approved terminology. Treat context.suggestedGlossary as advisory terminology learned from prior chapters: prefer it when the source meaning and current context match, but never let it override the source or a binding glossary entry.\nTranslate the complete chapter and, in the same response, return a compact canon analysis grounded only in the source. Keep canon fields concise so translation quality remains the priority.`),
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

export async function polishChapterWithCanonAi(input: {
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
    task: "ESCALATION",
    systemPrompt: POLISH_SYSTEM_PROMPT,
    cache: input.cache,
    payload: {
      context: input.context,
      source: { title: input.sourceTitle, content: input.sourceContent },
      currentTranslation: { title: input.translatedTitle, content: input.translatedContent },
    },
    schemaName: "polished_novel_translation_with_canon",
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

export async function reviewNovelMetadataWithAi(input: {
  model: AiModel;
  serviceTier?: "auto" | "default" | "flex";
  sourceTitle: string;
  sourceSynopsis: string | null;
  translatedTitle: string;
  translatedSynopsis: string | null;
  sourceLanguage: string;
  targetLanguage: string;
  profile: { styleGuide: string; instructions: string } | null;
  focus?: "ALL" | "SYNOPSIS";
}) {
  return structured({
    model: input.model,
    task: "METADATA_LOCALIZATION",
    serviceTier: input.serviceTier,
    systemPrompt: METADATA_LOCALIZATION_SYSTEM_PROMPT,
    payload: {
      languages: { source: input.sourceLanguage, target: input.targetLanguage },
      source: { title: input.sourceTitle, synopsis: input.sourceSynopsis },
      translation: { title: input.translatedTitle, synopsis: input.translatedSynopsis },
      profile: input.profile,
      focus: input.focus ?? "ALL",
    },
    schemaName: "novel_metadata_localization_review",
    jsonSchema: jsonObject({
      score: { type: "integer", minimum: 0, maximum: 100 },
      synopsisScore: { type: "integer", minimum: 0, maximum: 100 },
      fidelityScore: { type: "integer", minimum: 0, maximum: 100 },
      verdict: { type: "string", enum: ["NATURAL", "NEEDS_REVISION"] },
      issues: boundedStringArray(20),
      recommendedTitle: { type: "string" },
      recommendedSynopsis: { type: ["string", "null"] },
      candidates: {
        type: "array",
        minItems: 1,
        maxItems: 5,
        items: jsonObject({ title: { type: "string" }, rationale: { type: "string" } }),
      },
    }),
    parser: metadataReviewSchema,
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
  minimumScore?: number;
  cache?: PromptCacheInput;
}) {
  return structured({
    model: input.model,
    task: "FIRST_QA",
    systemPrompt: QA_SYSTEM_PROMPT,
    cache: input.cache,
    payload: {
      context: input.context,
      quality: { minimumScore: input.minimumScore ?? 90 },
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
    systemPrompt: withThaiNovelLocalizationRules(`${input.prompt.systemPrompt}\nRevise the supplied translation to resolve every QA issue. Return the complete corrected chapter, not a patch.`),
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

type AiUsageResult = Pick<StructuredAiResult, "inputTokens" | "cachedInputTokens" | "cacheWriteInputTokens" | "outputTokens" | "serviceTier">;

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
  const processingDiscount = result.serviceTier === "flex" ? 0.5 : 1;
  return Math.round((
    uncachedInputTokens * inputCost
    + cachedInputTokens * inputCost * 0.1
    + cacheWriteInputTokens * inputCost * 1.25
    + result.outputTokens * Number(model.outputCostMicrosPerMillion)
  ) * processingDiscount / 1_000_000);
}

export function aiCallCostMicros(call: AiCallRecord) {
  return aiUsageCostMicros(call.model, call.result);
}
