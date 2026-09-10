import { describe, expect, it } from "vitest";

import { appendGlossaryTargetAlternative, applySafeQaSuggestions, parseProviderTranslation, runDeterministicQa, segmentText, selectBestTranslationModel, sha256 } from "./translation";

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

  it("does not match a locked Latin term inside a longer word", () => {
    const issues = runDeterministicQa({
      source: "The tea party was hosted by Viscountess Bray.",
      translation: "งานเลี้ยงน้ำชาจัดโดยไวเคาน์เตสเบรย์",
      lockedTerms: [{ sourceTerm: "viscount", targetTerm: "ไวเคานต์" }],
    });

    expect(issues.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING")).toBe(false);
  });

  it("still requires a complete case-insensitive Latin glossary match", () => {
    const issues = runDeterministicQa({
      source: "The Viscount entered.",
      translation: "ขุนนางเดินเข้ามา",
      lockedTerms: [{ sourceTerm: "viscount", targetTerm: "ไวเคานต์" }],
    });

    expect(issues.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING")).toBe(true);
  });

  it("records the aligned paragraph and a safe replacement for a retained source term", () => {
    const [issue] = runDeterministicQa({
      source: "Trait unlocked.\n\nThe gate opened.",
      translation: "Trait ถูกปลดล็อกแล้ว\n\nประตูเปิดออก",
      lockedTerms: [{ sourceTerm: "trait", targetTerm: "ลักษณะเฉพาะ" }],
    }).filter((candidate) => candidate.code === "LOCKED_GLOSSARY_MISSING");

    expect(issue?.metadata).toMatchObject({
      location: "CONTENT",
      sourceSegmentIndex: 0,
      translationSegmentIndex: 0,
      currentText: "Trait",
      suggestedText: "ลักษณะเฉพาะ",
      mappingConfidence: "HIGH",
    });
  });

  it("checks a locked term in its aligned paragraph rather than elsewhere in the chapter", () => {
    const issues = runDeterministicQa({
      source: "An unrelated line.\n\nThis trait is rare.",
      translation: "ลักษณะเฉพาะอีกอย่างหนึ่ง\n\nสิ่งนี้หาได้ยาก",
      lockedTerms: [{ sourceTerm: "trait", targetTerm: "ลักษณะเฉพาะ" }],
    });

    expect(issues.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING"
      && issue.metadata?.sourceSegmentIndex === 1)).toBe(true);
  });

  it("accepts one context-appropriate option from a slash-separated locked target", () => {
    const polite = runDeterministicQa({
      source: "You should enter, Your Grace.",
      translation: "ท่านควรเข้าไปขอรับ",
      lockedTerms: [{ sourceTerm: "you", targetTerm: "คุณ / ท่าน" }],
    });
    const casual = runDeterministicQa({
      source: "You can come with me.",
      translation: "คุณไปกับฉันได้นะ",
      lockedTerms: [{ sourceTerm: "you", targetTerm: "คุณ / ท่าน" }],
    });
    const missing = runDeterministicQa({
      source: "You can come with me.",
      translation: "ไปกับฉันได้นะ",
      lockedTerms: [{ sourceTerm: "you", targetTerm: "คุณ / ท่าน" }],
    });

    expect(polite.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING")).toBe(false);
    expect(casual.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING")).toBe(false);
    expect(missing.some((issue) => issue.code === "LOCKED_GLOSSARY_MISSING")).toBe(true);
  });

  it("appends a glossary alternative without creating case-insensitive duplicates", () => {
    expect(appendGlossaryTargetAlternative("การอัญเชิญ", "เวทอัญเชิญ")).toBe("การอัญเชิญ / เวทอัญเชิญ");
    expect(appendGlossaryTargetAlternative("Viscount / Earl", "viscount")).toBe("Viscount / Earl");
  });

  it("parses structured provider output and rejects partial output", () => {
    expect(parseProviderTranslation('```json\n{"title":"ตอนหนึ่ง","content":"เนื้อหา"}\n```')).toEqual({
      title: "ตอนหนึ่ง",
      content: "เนื้อหา",
    });
    expect(() => parseProviderTranslation('{"title":"ตอนหนึ่ง"}')).toThrow();
  });

  it("applies unique QA replacements and leaves ambiguous suggestions for AI correction", () => {
    const result = applySafeQaSuggestions({ title: "Old title", content: "The duke paused. The guard waited. waited." }, [
      { severity: "WARNING", location: "TITLE", currentText: "Old title", suggestedText: "A Better Title" },
      { severity: "CRITICAL", location: "CONTENT", currentText: "The duke paused.", suggestedText: "The duke hesitated." },
      { severity: "WARNING", location: "CONTENT", currentText: "waited", suggestedText: "stood by" },
    ]);

    expect(result.translation).toEqual({ title: "A Better Title", content: "The duke hesitated. The guard waited. waited." });
    expect(result.appliedCount).toBe(2);
    expect(result.remainingIssues).toHaveLength(1);
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
