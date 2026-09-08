import { describe, expect, it } from "vitest";

import { AUTOMATIC_TRANSLATION_MODELS, automaticModelNameForTask } from "./translation-ai-routing";

describe("automatic translation AI routing", () => {
  it("routes production translation and escalation to the intended models", () => {
    expect(automaticModelNameForTask("MAIN_TRANSLATION")).toBe("gpt-5.6-sol");
    expect(automaticModelNameForTask("FIRST_QA")).toBe("gpt-5.6-terra");
    expect(automaticModelNameForTask("ENTITY_EXTRACTION")).toBe("gpt-5.6-luna");
    expect(automaticModelNameForTask("ESCALATION")).toBe("gpt-6-astra");
  });

  it("contains one managed preset for every routed API model", () => {
    const configured = new Set(AUTOMATIC_TRANSLATION_MODELS.map((model) => model.modelName));
    expect(configured).toEqual(new Set(["gpt-6-astra", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]));
  });
});
