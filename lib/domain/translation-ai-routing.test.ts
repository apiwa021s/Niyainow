import { describe, expect, it } from "vitest";

import {
  AUTOMATIC_TRANSLATION_MODELS,
  AUTOMATIC_TRANSLATION_PROMPT_VERSION,
  AUTOMATIC_TRANSLATION_SYSTEM_PROMPT,
  automaticModelNameForTask,
  withThaiNovelLocalizationRules,
} from "./translation-ai-routing";

describe("automatic translation AI routing", () => {
  it("routes production translation and escalation to the intended models", () => {
    expect(automaticModelNameForTask("MAIN_TRANSLATION")).toBe("gpt-5.6-sol");
    expect(automaticModelNameForTask("FIRST_QA")).toBe("gpt-5.6-terra");
    expect(automaticModelNameForTask("ENTITY_EXTRACTION")).toBe("gpt-5.6-luna");
    expect(automaticModelNameForTask("PROFILE_QUALITY_REVIEW")).toBe("gpt-6-astra");
    expect(automaticModelNameForTask("METADATA_LOCALIZATION")).toBe("gpt-6-astra");
    expect(automaticModelNameForTask("ESCALATION")).toBe("gpt-5.6-sol");
    expect(automaticModelNameForTask("PREMIUM_EDIT")).toBe("gpt-5.6-sol");
    expect(["CANON_EXTRACTION", "MAIN_TRANSLATION", "FIRST_QA", "ESCALATION", "PREMIUM_EDIT"]
      .map((task) => automaticModelNameForTask(task as Parameters<typeof automaticModelNameForTask>[0])))
      .not.toContain("gpt-6-astra");
  });

  it("contains one managed preset for every routed API model", () => {
    const configured = new Set(AUTOMATIC_TRANSLATION_MODELS.map((model) => model.modelName));
    expect(configured).toEqual(new Set(["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]));
  });

  it("versions and injects the Thai-native prose requirements once", () => {
    expect(AUTOMATIC_TRANSLATION_PROMPT_VERSION).toBe(6);
    expect(AUTOMATIC_TRANSLATION_SYSTEM_PROMPT).toContain("natural Thai equivalents");
    expect(AUTOMATIC_TRANSLATION_SYSTEM_PROMPT).toContain("ดับกระหาย");
    expect(AUTOMATIC_TRANSLATION_SYSTEM_PROMPT).toContain("exactly one blank line between paragraphs");
    expect(AUTOMATIC_TRANSLATION_SYSTEM_PROMPT).toContain("over 260 characters");

    const repeated = withThaiNovelLocalizationRules(AUTOMATIC_TRANSLATION_SYSTEM_PROMPT);
    expect(repeated.match(/Thai localization requirements/g)).toHaveLength(1);
  });
});
