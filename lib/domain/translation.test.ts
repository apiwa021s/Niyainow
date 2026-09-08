import { describe, expect, it } from "vitest";

import { parseProviderTranslation, runDeterministicQa, segmentText, selectBestTranslationModel, sha256 } from "./translation";

describe("translation domain", () => {
  it("creates stable paragraph segments", () => {
    expect(segmentText(" First \r\n\r\n Second ")).toEqual([
      { segmentIndex: 0, content: "First", contentHash: sha256("First") },
      { segmentIndex: 1, content: "Second", contentHash: sha256("Second") },
    ]);
  });

  it("requires locked glossary terms that occur in the source", () => {
    const issues = runDeterministicQa({
      source: "Lin opened the gate.",
      translation: "เขาเปิดประตู",
      lockedTerms: [{ sourceTerm: "Lin", targetTerm: "หลิน" }],
    });
    expect(issues.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING" && issue.severity === "CRITICAL")).toBe(true);
  });

  it("parses structured provider output and rejects partial output", () => {
    expect(parseProviderTranslation('```json\n{"title":"ตอนหนึ่ง","content":"เนื้อหา"}\n```')).toEqual({
      title: "ตอนหนึ่ง",
      content: "เนื้อหา",
    });
    expect(() => parseProviderTranslation('{"title":"ตอนหนึ่ง"}')).toThrow();
  });

  it("selects the most specific compatible translation model before cost", () => {
    const base = { selectionPriority: 100, inputCostMicrosPerMillion: 10, outputCostMicrosPerMillion: 10 };
    const selected = selectBestTranslationModel([
      { ...base, id: "generic", supportedLanguagePairs: ["*"] },
      { ...base, id: "target", supportedLanguagePairs: ["*>th"] },
      { ...base, id: "exact", supportedLanguagePairs: ["en>th"], inputCostMicrosPerMillion: 100 },
    ], "en", "th");
    expect(selected?.id).toBe("exact");
  });

  it("uses priority and then cost for equally compatible models", () => {
    const selected = selectBestTranslationModel([
      { id: "cheap", supportedLanguagePairs: ["en>th"], selectionPriority: 100, inputCostMicrosPerMillion: 1, outputCostMicrosPerMillion: 1 },
      { id: "preferred", supportedLanguagePairs: ["en>th"], selectionPriority: 200, inputCostMicrosPerMillion: 100, outputCostMicrosPerMillion: 100 },
    ], "en", "th");
    expect(selected?.id).toBe("preferred");
  });
});
