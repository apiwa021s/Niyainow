import { describe, expect, it } from "vitest";

import { parseCsv, selectTranslationMasterContext, type TranslationMasterBundle } from "@/lib/domain/translation-master";

describe("translation master", () => {
  it("parses quoted commas, escaped quotes and multiline cells", () => {
    expect(parseCsv('\uFEFF"id","note"\r\n"G001","line 1, value\nline ""2"""\r\n')).toEqual([
      ["id", "note"],
      ["G001", 'line 1, value\nline "2"'],
    ]);
  });

  it("selects one base, compatible overlays, a recipe and pinned versions", () => {
    const profile = (id: string, kind: string, name: string) => ({
      profile_id: id,
      profile_kind: kind,
      genre_family: id === "G009" ? "EASTERN_FANTASY" : "RELATIONSHIP",
      name_th: name,
      name_en: name,
      activation_conditions_th: "when supported by source",
      emotion_target_th: "preserve",
      narration_style_th: "faithful",
      dialogue_style_th: "natural",
      pronoun_honorific_rules_th: "by relationship",
      sentence_rhythm_th: "follow scene",
      imagery_rules_th: "do not add",
      cultural_localization_rules_th: "retain canon",
      terminology_categories_json: [],
      glossary_rules_th: "story glossary wins",
      required_story_memory_json: [],
      avoid_rules_json: [],
      qa_checks_json: [],
      translator_instruction_th: "translate faithfully",
      polish_instruction_th: "compare source",
      recommended_scene_ids_json: ["SC01"],
      compatible_base_ids_json: [],
      version: "1.0.0",
      review_status: "APPROVED" as const,
    });
    const bundle: TranslationMasterBundle = {
      genres: [profile("G000", "BASE_GENRE", "Faithful neutral"), profile("G009", "BASE_GENRE", "Xianxia and cultivation"), profile("O003", "TROPE_OVERLAY", "Regression and rebirth overlay")],
      scenes: [{
        scene_id: "SC01", name_th: "ฉากต่อสู้", activation_conditions_th: "combat only", emotion_target_th: "pressure",
        translator_instruction_th: "clear action", polish_instruction_th: "check sequence", avoid_rules_json: [], qa_checks_json: [], required_story_memory_json: [],
        version: "1.0.0", review_status: "APPROVED",
      }],
      globalRules: [{ rule_id: "R01", category: "FIDELITY", priority: 1, name_th: "ซื่อตรง", instruction_th: "do not invent", validation_th: "compare", version: "1.0.0", review_status: "APPROVED" }],
      recipes: [{ recipe_id: "P01", name_th: "เซียนเกิดใหม่", base_profile_id: "G009", overlay_profile_ids_json: ["O003"], scene_candidates_json: ["SC01"], selection_reason_th: "match", activation_guard_th: "source only", runtime_instruction_th: "compose", is_default: false, version: "1.0.0", review_status: "APPROVED" }],
    };

    const result = selectTranslationMasterContext(bundle, {
      genre: "Xianxia cultivation",
      subgenres: ["rebirth"],
      tone: "epic",
      narrativeVoice: "third person",
      terminologyRisks: ["cultivation ranks"],
    });

    expect(result?.selection.baseProfile?.id).toBe("G009");
    expect(result?.selection.overlays.map((row) => row.id)).toContain("O003");
    expect(result?.selection.recipe?.id).toBe("P01");
    expect(result?.selection.sceneCandidates.map((row) => row.id)).toEqual(["SC01"]);
    expect(result?.selection.globalRuleVersions).toEqual(["R01@1.0.0"]);
    expect(result?.guidance).not.toContain("source_url");
  });

  it("does not activate relationship overlays from a generic family word", () => {
    const base = {
      profile_id: "G000", profile_kind: "BASE_GENRE", genre_family: "GENERAL", name_th: "กลาง", name_en: "Faithful neutral",
      activation_conditions_th: "fallback", emotion_target_th: "preserve", narration_style_th: "faithful", dialogue_style_th: "natural",
      pronoun_honorific_rules_th: "context", sentence_rhythm_th: "source", imagery_rules_th: "source", cultural_localization_rules_th: "source",
      terminology_categories_json: [], glossary_rules_th: "story wins", required_story_memory_json: [], avoid_rules_json: [], qa_checks_json: [],
      translator_instruction_th: "faithful", polish_instruction_th: "compare", recommended_scene_ids_json: [], compatible_base_ids_json: [],
      version: "1.0.0", review_status: "APPROVED" as const,
    };
    const bl = { ...base, profile_id: "O001", profile_kind: "RELATIONSHIP_OVERLAY", genre_family: "RELATIONSHIP", name_th: "BL", name_en: "BL relationship overlay" };
    const result = selectTranslationMasterContext({ genres: [base, bl], scenes: [], globalRules: [], recipes: [] }, {
      genre: "relationship drama", subgenres: [], tone: "serious", narrativeVoice: "third person", terminologyRisks: [],
    });
    expect(result?.selection.overlays).toEqual([]);
  });

  it("uses an AI proposal only after validating profile compatibility", () => {
    const profile = (id: string, kind: string, compatibleBaseIds: string[] = []) => ({
      profile_id: id, profile_kind: kind, genre_family: kind === "BASE_GENRE" ? "FANTASY" : "PLOT_TROPE", name_th: id, name_en: id,
      activation_conditions_th: "source evidence required", emotion_target_th: "preserve", narration_style_th: "faithful", dialogue_style_th: "natural",
      pronoun_honorific_rules_th: "context", sentence_rhythm_th: "source", imagery_rules_th: "source", cultural_localization_rules_th: "source",
      terminology_categories_json: [], glossary_rules_th: "story wins", required_story_memory_json: [], avoid_rules_json: [], qa_checks_json: [],
      translator_instruction_th: "faithful", polish_instruction_th: "compare", recommended_scene_ids_json: [], compatible_base_ids_json: compatibleBaseIds,
      version: "1.0.0", review_status: "APPROVED" as const,
    });
    const bundle: TranslationMasterBundle = {
      genres: [profile("G000", "BASE_GENRE"), profile("G010", "BASE_GENRE"), profile("O006", "TROPE_OVERLAY", ["G010"]), profile("O009", "SETTING_OVERLAY", ["G009"])],
      scenes: [], globalRules: [], recipes: [],
    };
    const result = selectTranslationMasterContext(bundle, {
      genre: "fantasy", subgenres: ["revenge"], tone: "serious", narrativeVoice: "third person", terminologyRisks: [],
    }, {
      baseProfileId: "G010", overlayProfileIds: ["O006", "O009", "NOT_FOUND"], recipeId: null,
      confidence: 92, reason: "Fantasy revenge is explicit in the samples", sourceSignals: ["the protagonist seeks revenge"],
    });
    expect(result?.selection.routing.method).toBe("AI_VALIDATED");
    expect(result?.selection.baseProfile?.id).toBe("G010");
    expect(result?.selection.overlays.map((row) => row.id)).toEqual(["O006"]);
    expect(result?.selection.routing.confidence).toBe(92);
  });
});
