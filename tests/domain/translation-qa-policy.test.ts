import { describe, expect, it } from "vitest";

import { applySafeQaSuggestions, applyValidatedQaPatches, decideTranslationQa } from "@/lib/domain/translation";

describe("translation QA policy", () => {
  it("allows warnings at or above the quality threshold", () => {
    const decision = decideTranslationQa({
      score: 92,
      minimumScore: 90,
      aiIssues: [{ code: "STYLE", severity: "WARNING", message: "Could read more naturally" }],
      deterministicIssues: [],
    });

    expect(decision.canAutoApprove).toBe(true);
    expect(decision.needsCorrection).toBe(false);
    expect(decision.warnings).toHaveLength(1);
  });

  it("blocks critical issues and low scores", () => {
    expect(decideTranslationQa({
      score: 95,
      aiIssues: [],
      deterministicIssues: [{ code: "LOCKED_GLOSSARY_MISSING", severity: "CRITICAL", message: "missing" }],
    }).needsCorrection).toBe(true);

    expect(decideTranslationQa({
      score: 89,
      aiIssues: [],
      deterministicIssues: [],
      minimumScore: 90,
    }).needsCorrection).toBe(true);
  });
});

describe("translation QA patches", () => {
  it("applies only unique exact replacements", () => {
    const result = applyValidatedQaPatches(
      { title: "Chapter", content: "The cat sat down. The dog stayed." },
      [
        { location: "CONTENT", currentText: "The cat sat down.", replacementText: "The cat curled up." },
        { location: "CONTENT", currentText: "missing", replacementText: "ignored" },
      ],
    );

    expect(result.translation.content).toBe("The cat curled up. The dog stayed.");
    expect(result.appliedCount).toBe(1);
    expect(result.rejectedPatches).toMatchObject([{ reason: "TARGET_NOT_FOUND" }]);
  });

  it("supports a QA suggestion that removes unsupported text", () => {
    const result = applySafeQaSuggestions(
      { title: "Chapter", content: "แมวขนสีทองเดินเข้ามา" },
      [{ severity: "CRITICAL" as const, location: "CONTENT" as const, currentText: "ขน", suggestedText: "" }],
    );

    expect(result.translation.content).toBe("แมวสีทองเดินเข้ามา");
    expect(result.appliedCount).toBe(1);
  });
});
