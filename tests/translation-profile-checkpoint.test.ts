import { afterEach, describe, expect, it, vi } from "vitest";

import type { TranslationMasterBundle } from "@/lib/domain/translation-master";
import {
  generateAiTranslationProfile,
  type AiProfileGenerationCheckpoint,
} from "@/services/ai/translation-pipeline";

const model = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "Test model",
  provider: "openai-compatible",
  modelName: "test-model",
  baseUrl: "https://provider.example/v1",
  apiKeyEnv: "TEST_AI_KEY",
  inputCostMicrosPerMillion: 1,
  outputCostMicrosPerMillion: 1,
  selectionPriority: 1,
  supportedLanguagePairs: ["*"],
  isActive: true,
  createdBy: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
};

const masterBundle: TranslationMasterBundle = {
  genres: [{
    profile_id: "G000",
    profile_kind: "BASE_GENRE",
    genre_family: "GENERAL",
    name_th: "ทั่วไป",
    name_en: "General",
    activation_conditions_th: "fallback",
    emotion_target_th: "preserve",
    narration_style_th: "faithful",
    dialogue_style_th: "natural",
    pronoun_honorific_rules_th: "context",
    sentence_rhythm_th: "source",
    imagery_rules_th: "source",
    cultural_localization_rules_th: "source",
    terminology_categories_json: [],
    glossary_rules_th: "story wins",
    required_story_memory_json: [],
    avoid_rules_json: [],
    qa_checks_json: [],
    translator_instruction_th: "faithful",
    polish_instruction_th: "compare",
    recommended_scene_ids_json: [],
    compatible_base_ids_json: [],
    version: "1.0.0",
    review_status: "APPROVED",
  }],
  scenes: [],
  globalRules: [],
  recipes: [],
};

function outputFor(task: string): Record<string, unknown> {
  if (task === "PROFILE_ANALYSIS") return {
    genre: "general",
    subgenres: [],
    tone: "warm",
    narrativeVoice: "third person",
    terminologyRisks: [],
    translationStrategy: "faithful and natural",
    masterRouting: { baseProfileId: "G000", overlayProfileIds: [], recipeId: null, confidence: 90, reason: "general fiction", sourceSignals: ["opening"] },
  };
  if (task === "FOUNDATION") return {
    name: "General profile",
    styleGuide: "Natural Thai prose",
    instructions: "Preserve meaning",
    preserveParagraphs: true,
    translatedTitle: "ชื่อแปล",
    translatedSynopsis: "เรื่องย่อแปล",
  };
  if (task === "PROFILE_QUALITY_REVIEW") return {
    ...outputFor("FOUNDATION"),
    reviewNotes: ["passed"],
  };
  if (task === "METADATA_LOCALIZATION") return {
    score: 92,
    synopsisScore: 95,
    fidelityScore: 100,
    verdict: "NATURAL",
    issues: [],
    recommendedTitle: "ชื่อแปลฉบับเกลา",
    recommendedSynopsis: "เรื่องย่อฉบับเกลา",
    candidates: [{ title: "ชื่อแปลฉบับเกลา", rationale: "เป็นธรรมชาติ" }],
  };
  return { glossary: [], characters: [] };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TEST_AI_KEY;
});

describe("AI translation profile checkpoints", () => {
  it("reuses completed AI stages after an interrupted run", async () => {
    process.env.TEST_AI_KEY = "test-secret";
    let failQualityOnce = true;
    const requestedTasks: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ content: string }> };
      const payload = JSON.parse(body.messages.at(-1)?.content ?? "{}") as { task: string };
      requestedTasks.push(payload.task);
      if (payload.task === "PROFILE_QUALITY_REVIEW" && failQualityOnce) {
        failQualityOnce = false;
        throw new Error("connection interrupted");
      }
      return new Response(JSON.stringify({
        id: `request-${payload.task}`,
        choices: [{ message: { content: JSON.stringify(outputFor(payload.task)) } }],
        usage: { prompt_tokens: 10, completion_tokens: 10 },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }));

    let checkpoint: AiProfileGenerationCheckpoint | undefined;
    const input = {
      title: "Source title",
      synopsis: "Source synopsis",
      sourceLanguage: "en",
      targetLanguage: "th",
      samples: [{ chapterNumber: 1, title: "One", content: "Opening chapter" }],
      masterBundle,
      models: { PROFILE_ANALYSIS: model, FOUNDATION: model, PROFILE_QUALITY_REVIEW: model, METADATA_LOCALIZATION: model, ENTITY_EXTRACTION: model },
      checkpointSignature: "same-input-v1",
      onCheckpoint: (next: AiProfileGenerationCheckpoint) => { checkpoint = next; },
    };

    await expect(generateAiTranslationProfile(input)).rejects.toThrow("connection interrupted");
    expect(checkpoint).toMatchObject({ analysis: {}, foundation: {} });
    expect(checkpoint).not.toHaveProperty("qualityReview");

    const result = await generateAiTranslationProfile({ ...input, checkpoint });

    expect(result.profile.name).toBe("General profile");
    expect(result.metadata.synopsis).toBe("เรื่องย่อฉบับเกลา");
    expect(requestedTasks).toEqual([
      "PROFILE_ANALYSIS",
      "FOUNDATION",
      "PROFILE_QUALITY_REVIEW",
      "PROFILE_QUALITY_REVIEW",
      "METADATA_LOCALIZATION",
      "ENTITY_EXTRACTION",
    ]);
  });
});
