import "server-only";

import { z } from "zod";

import type { translationAiModels, translationPromptVersions } from "@/db/schema";
import type { AutomaticTranslationTask } from "@/lib/domain/translation-ai-routing";
import { getTranslationProvider, type StructuredAiResult } from "@/services/ai/translation-provider";

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
});

const foundationSchema = z.object({
  name: z.string().min(1).max(160),
  styleGuide: z.string().min(1).max(20_000),
  instructions: z.string().min(1).max(20_000),
  preserveParagraphs: z.boolean(),
  translatedTitle: z.string().min(1).max(1_000),
  translatedSynopsis: z.string().min(1).max(20_000).nullable(),
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

const chapterAnalysisSchema = z.object({
  summary: z.string().min(1).max(8_000),
  continuityFacts: z.array(z.string().min(1).max(1_000)).max(50),
  entities: z.array(z.string().min(1).max(300)).max(100),
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
  })).max(100),
  correctionInstructions: z.array(z.string().min(1).max(1_000)).max(50),
});

const translationSchema = z.object({ title: z.string().min(1).max(1_000), content: z.string().min(1).max(2_000_000) });

const PROFILE_SYSTEM_PROMPT = `You design production translation profiles for serialized fiction.
Analyze only the supplied title and synopsis. Never invent plot facts. Produce actionable guidance in the target language.
Translate the novel title and complete synopsis faithfully into the requested target language. Preserve names according to the profile strategy and do not summarize, omit, or add story details.
Names, terms, and character suggestions must be grounded in the supplied metadata. Return only the requested structured output.`;

const CHAPTER_ANALYSIS_PROMPT = `You are a continuity analyst for serialized-fiction translation.
Analyze the complete source chapter faithfully. Identify canon, entities, difficulty, and translation risks without adding facts.
Return only the requested structured output.`;

const QA_SYSTEM_PROMPT = `You are a rigorous bilingual QA editor for serialized fiction.
Compare the complete source and translation for omissions, additions, mistranslations, name inconsistency, tone, and paragraph integrity.
Mark passed=false when revision is required. Return only the requested structured output.`;

function jsonObject(properties: Record<string, unknown>, required = Object.keys(properties)) {
  return { type: "object", additionalProperties: false, properties, required };
}

const stringArray = { type: "array", items: { type: "string" } };

async function structured<T>(input: {
  model: AiModel;
  task: AutomaticTranslationTask;
  systemPrompt: string;
  payload: Record<string, unknown>;
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
  models: Record<"PROFILE_ANALYSIS" | "FOUNDATION" | "ENTITY_EXTRACTION", AiModel>;
  onStage?: (event: AiStageEvent) => void | Promise<void>;
}) {
  const source = { title: input.title, synopsis: input.synopsis?.trim() || null, sourceLanguage: input.sourceLanguage, targetLanguage: input.targetLanguage };
  await input.onStage?.({ stage: "PROFILE_ANALYSIS", label: "AI กำลังวิเคราะห์แนวเรื่อง น้ำเสียง และความเสี่ยง", modelName: input.models.PROFILE_ANALYSIS.modelName });
  const analysis = await structured({
    model: input.models.PROFILE_ANALYSIS,
    task: "PROFILE_ANALYSIS",
    systemPrompt: PROFILE_SYSTEM_PROMPT,
    payload: { source },
    schemaName: "novel_profile_analysis",
    jsonSchema: jsonObject({
      genre: { type: "string" }, subgenres: stringArray, tone: { type: "string" }, narrativeVoice: { type: "string" },
      terminologyRisks: stringArray, translationStrategy: { type: "string" },
    }),
    parser: analysisSchema,
    timeoutMs: 75_000,
  });

  await input.onStage?.({ stage: "FOUNDATION", label: "AI กำลังแปลชื่อเรื่องและเรื่องย่อ พร้อมสร้าง Style guide", modelName: input.models.FOUNDATION.modelName });
  const foundation = await structured({
    model: input.models.FOUNDATION,
    task: "FOUNDATION",
    systemPrompt: PROFILE_SYSTEM_PROMPT,
    payload: { source, analysis: analysis.value },
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
    timeoutMs: 75_000,
  });

  await input.onStage?.({ stage: "ENTITY_EXTRACTION", label: "AI กำลังสกัดชื่อ ตัวละคร และศัพท์เริ่มต้น", modelName: input.models.ENTITY_EXTRACTION.modelName });
  const entities = await structured({
    model: input.models.ENTITY_EXTRACTION,
    task: "ENTITY_EXTRACTION",
    systemPrompt: PROFILE_SYSTEM_PROMPT,
    payload: { source, analysis: analysis.value },
    schemaName: "novel_profile_entities",
    jsonSchema: jsonObject({
      glossary: { type: "array", items: jsonObject({ sourceTerm: { type: "string" }, targetTerm: { type: "string" }, note: { type: ["string", "null"] } }) },
      characters: { type: "array", items: jsonObject({ sourceName: { type: "string" }, targetName: { type: "string" }, aliases: stringArray, description: { type: ["string", "null"] }, speakingStyle: { type: ["string", "null"] } }) },
    }),
    parser: entitiesSchema,
    timeoutMs: 75_000,
  });

  const { translatedTitle, translatedSynopsis, ...profile } = foundation.value;
  return {
    profile,
    metadata: { title: translatedTitle.trim(), synopsis: translatedSynopsis?.trim() || null },
    analysis: analysis.value,
    ...entities.value,
    calls: [analysis.call, foundation.call, entities.call],
  };
}

export async function analyzeChapterWithAi(input: {
  model: AiModel;
  sourceTitle: string;
  sourceContent: string;
  context: Record<string, unknown>;
}) {
  return structured({
    model: input.model,
    task: "CANON_EXTRACTION",
    systemPrompt: CHAPTER_ANALYSIS_PROMPT,
    payload: { context: input.context, source: { title: input.sourceTitle, content: input.sourceContent } },
    schemaName: "chapter_canon_analysis",
    jsonSchema: jsonObject({ summary: { type: "string" }, continuityFacts: stringArray, entities: stringArray, difficulty: { type: "string", enum: ["NORMAL", "HARD"] }, translationNotes: stringArray }),
    parser: chapterAnalysisSchema,
  });
}

export async function qaTranslationWithAi(input: {
  model: AiModel;
  sourceTitle: string;
  sourceContent: string;
  translatedTitle: string;
  translatedContent: string;
  context: Record<string, unknown>;
}) {
  return structured({
    model: input.model,
    task: "FIRST_QA",
    systemPrompt: QA_SYSTEM_PROMPT,
    payload: {
      context: input.context,
      source: { title: input.sourceTitle, content: input.sourceContent },
      translation: { title: input.translatedTitle, content: input.translatedContent },
    },
    schemaName: "translation_qa",
    jsonSchema: jsonObject({
      passed: { type: "boolean" }, score: { type: "integer", minimum: 0, maximum: 100 },
      issues: { type: "array", items: jsonObject({ code: { type: "string" }, severity: { type: "string", enum: ["INFO", "WARNING", "CRITICAL"] }, message: { type: "string" } }) },
      correctionInstructions: stringArray,
    }),
    parser: qaSchema,
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
}) {
  return structured({
    model: input.model,
    task: "ESCALATION",
    systemPrompt: `${input.prompt.systemPrompt}\nRevise the supplied translation to resolve every QA issue. Return the complete corrected chapter, not a patch.`,
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

export function aiCallCostMicros(call: AiCallRecord) {
  return Math.round((
    call.result.inputTokens * Number(call.model.inputCostMicrosPerMillion)
    + call.result.outputTokens * Number(call.model.outputCostMicrosPerMillion)
  ) / 1_000_000);
}
