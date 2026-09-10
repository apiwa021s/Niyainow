import { createHash } from "node:crypto";

export type TranslationQaIssue = {
  code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  metadata?: Record<string, unknown>;
};

export type QaTextSuggestion = {
  severity: "INFO" | "WARNING" | "CRITICAL";
  location: "TITLE" | "CONTENT" | null;
  currentText: string | null;
  suggestedText: string | null;
};

export type TranslationQaDecisionInput = {
  score: number;
  aiIssues: TranslationQaIssue[];
  deterministicIssues: TranslationQaIssue[];
  minimumScore?: number;
};

/**
 * Production QA gate. Only critical fidelity/structure/glossary failures block
 * automatic approval. A low aggregate score still triggers one focused editor
 * pass, while warnings remain visible to editors without stalling the queue.
 */
export function decideTranslationQa(input: TranslationQaDecisionInput) {
  const minimumScore = Math.max(0, Math.min(100, input.minimumScore ?? 90));
  const allIssues = [...input.aiIssues, ...input.deterministicIssues];
  const blockingIssues = allIssues.filter((issue) => issue.severity === "CRITICAL");
  const warnings = allIssues.filter((issue) => issue.severity === "WARNING");
  const scoreNeedsImprovement = input.score < minimumScore;
  return {
    minimumScore,
    blockingIssues,
    warnings,
    scoreNeedsImprovement,
    needsCorrection: blockingIssues.length > 0 || scoreNeedsImprovement,
    canProceedToReview: blockingIssues.length === 0,
    canAutoApprove: blockingIssues.length === 0 && !scoreNeedsImprovement,
  };
}

export type QaTextPatch = {
  location: "TITLE" | "CONTENT";
  currentText: string;
  replacementText: string;
};

/** Applies bounded AI editor patches only when the target text is unambiguous. */
export function applyValidatedQaPatches(
  translation: { title: string; content: string },
  patches: QaTextPatch[],
) {
  let next = { ...translation };
  let appliedCount = 0;
  const rejectedPatches: Array<QaTextPatch & { reason: string }> = [];

  for (const patch of patches) {
    const current = patch.currentText;
    if (!current || current === patch.replacementText) {
      rejectedPatches.push({ ...patch, reason: "EMPTY_OR_UNCHANGED" });
      continue;
    }
    const field = patch.location === "TITLE" ? "title" : "content";
    const value = next[field];
    const firstIndex = value.indexOf(current);
    const occursOnce = firstIndex >= 0 && value.indexOf(current, firstIndex + current.length) === -1;
    if (!occursOnce) {
      rejectedPatches.push({ ...patch, reason: firstIndex < 0 ? "TARGET_NOT_FOUND" : "TARGET_NOT_UNIQUE" });
      continue;
    }
    const updated = `${value.slice(0, firstIndex)}${patch.replacementText}${value.slice(firstIndex + current.length)}`.trim();
    if (!updated) {
      rejectedPatches.push({ ...patch, reason: "WOULD_EMPTY_FIELD" });
      continue;
    }
    next = { ...next, [field]: updated };
    appliedCount += 1;
  }

  return { translation: next, appliedCount, rejectedPatches };
}

/** Applies only unambiguous QA replacements; uncertain edits remain for an AI editor. */
export function applySafeQaSuggestions<T extends QaTextSuggestion>(
  translation: { title: string; content: string },
  issues: T[],
) {
  let next = { ...translation };
  let appliedCount = 0;
  const remainingIssues: T[] = [];

  for (const issue of issues) {
    const current = issue.currentText;
    const suggested = issue.suggestedText;
    if (issue.severity === "INFO" || !issue.location || !current || suggested === null || current === suggested) {
      remainingIssues.push(issue);
      continue;
    }

    const field = issue.location === "TITLE" ? "title" : "content";
    const value = next[field];
    const firstIndex = value.indexOf(current);
    const occursOnce = firstIndex >= 0 && value.indexOf(current, firstIndex + current.length) === -1;
    if (!occursOnce) {
      remainingIssues.push(issue);
      continue;
    }

    next = {
      ...next,
      [field]: `${value.slice(0, firstIndex)}${suggested}${value.slice(firstIndex + current.length)}`,
    };
    appliedCount += 1;
  }

  return { translation: next, appliedCount, remainingIssues };
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Paragraph-sized units preserve the imported layout and stay stable across retries. */
export function segmentText(value: string) {
  return value
    .replaceAll("\r\n", "\n")
    .split(/\n{2,}/)
    .map((content) => content.trim())
    .filter(Boolean)
    .map((content, segmentIndex) => ({ segmentIndex, content, contentHash: sha256(content) }));
}

export function estimateTokens(value: string) {
  return Math.max(1, Math.ceil(value.length / 4));
}

export function countWords(value: string) {
  const words = value.trim().match(/[\p{L}\p{N}]+/gu);
  return words?.length ?? 0;
}

/** A slash in a locked target means the editor allows any one of those forms. */
export function glossaryTargetAlternatives(targetTerm: string) {
  const alternatives = targetTerm
    .split(/\s*(?:\/|／|\|)\s*/u)
    .map((term) => term.trim())
    .filter(Boolean);
  return alternatives.length ? [...new Set(alternatives)] : [targetTerm.trim()];
}

export function appendGlossaryTargetAlternative(targetTerm: string, alternative: string) {
  const next = alternative.trim();
  const alternatives = glossaryTargetAlternatives(targetTerm);
  if (!next || alternatives.some((entry) => entry.toLocaleLowerCase() === next.toLocaleLowerCase())) {
    return alternatives.join(" / ");
  }
  return [...alternatives, next].join(" / ");
}

function glossaryTermMatch(value: string, glossaryTerm: string) {
  const term = glossaryTerm.trim();
  if (!term) return null;

  // Latin glossary terms must match complete words/phrases. A plain includes()
  // made entries such as "viscount" fire for "Viscountess".
  if (/[A-Za-z]/u.test(term)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "iu").exec(value);
  }

  // Scripts without reliable whitespace word boundaries keep phrase matching.
  const index = value.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  return index >= 0 ? { 0: value.slice(index, index + term.length), index } : null;
}

function sourceContainsGlossaryTerm(source: string, sourceTerm: string) {
  return glossaryTermMatch(source, sourceTerm) !== null;
}

export type TranslationModelCandidate = {
  id: string;
  selectionPriority: number;
  supportedLanguagePairs: string[];
  inputCostMicrosPerMillion: number;
  outputCostMicrosPerMillion: number;
};

/** Selects the highest-priority model that explicitly supports the language pair, then uses cost as a tie-breaker. */
export function selectBestTranslationModel<T extends TranslationModelCandidate>(models: T[], sourceLanguage: string, targetLanguage: string): T | undefined {
  const source = sourceLanguage.toLowerCase();
  const target = targetLanguage.toLowerCase();
  const matchRank = (pairs: string[]) => pairs.reduce((best, rawPair) => {
    const pair = rawPair.trim().toLowerCase();
    if (pair === `${source}>${target}`) return Math.max(best, 4);
    if (pair === `${source}>*`) return Math.max(best, 3);
    if (pair === `*>${target}`) return Math.max(best, 2);
    if (pair === "*") return Math.max(best, 1);
    return best;
  }, 0);

  return models
    .map((model) => ({ model, rank: matchRank(model.supportedLanguagePairs) }))
    .filter(({ rank }) => rank > 0)
    .sort((left, right) =>
      right.rank - left.rank
      || right.model.selectionPriority - left.model.selectionPriority
      || (left.model.inputCostMicrosPerMillion + left.model.outputCostMicrosPerMillion)
        - (right.model.inputCostMicrosPerMillion + right.model.outputCostMicrosPerMillion))
    [0]?.model;
}

export function runDeterministicQa(input: {
  source: string;
  translation: string;
  lockedTerms: Array<{ sourceTerm: string; targetTerm: string }>;
}): TranslationQaIssue[] {
  const issues: TranslationQaIssue[] = [];
  const source = input.source.trim();
  const translation = input.translation.trim();

  if (!translation) {
    issues.push({ code: "EMPTY_TRANSLATION", severity: "CRITICAL", message: "คำแปลไม่มีเนื้อหา" });
    return issues;
  }

  const sourceSegments = segmentText(source).length;
  const translatedSegments = segmentText(translation).length;
  if (sourceSegments > 1 && translatedSegments < Math.ceil(sourceSegments * 0.6)) {
    issues.push({
      code: "MISSING_SEGMENTS",
      severity: "CRITICAL",
      message: "จำนวนย่อหน้าคำแปลน้อยกว่าต้นฉบับอย่างผิดปกติ",
      metadata: { sourceSegments, translatedSegments },
    });
  }

  if (translation.length < Math.max(20, source.length * 0.25)) {
    issues.push({
      code: "SUSPICIOUS_LENGTH",
      severity: "WARNING",
      message: "คำแปลสั้นกว่าต้นฉบับอย่างผิดปกติ",
      metadata: { sourceLength: source.length, translatedLength: translation.length },
    });
  }

  for (const term of input.lockedTerms) {
    const targetAlternatives = glossaryTargetAlternatives(term.targetTerm);
    const sourceMatches = segmentText(source).filter((segment) => sourceContainsGlossaryTerm(segment.content, term.sourceTerm));
    if (!sourceMatches.length) continue;

    const translatedSegments = segmentText(translation);
    for (const sourceSegment of sourceMatches) {
      const translatedSegment = translatedSegments[sourceSegment.segmentIndex] ?? null;
      const translatedText = translatedSegment?.content ?? "";
      const hasAllowedTarget = targetAlternatives.some((target) => glossaryTermMatch(translatedText, target) !== null);
      if (hasAllowedTarget) continue;

      const retainedSource = glossaryTermMatch(translatedText, term.sourceTerm);
      const safeCurrentText = retainedSource?.[0]
        ?? (translatedText.length > 0 && translatedText.length <= 4_000 ? translatedText : null);
      const safeSuggestedText = retainedSource?.[0] ? targetAlternatives[0] ?? term.targetTerm : null;
      issues.push({
        code: "LOCKED_GLOSSARY_MISSING",
        severity: "CRITICAL",
        message: `ไม่พบคำศัพท์ที่ล็อกไว้ในย่อหน้า ${sourceSegment.segmentIndex + 1}: ${targetAlternatives.join(" / ")}`,
        metadata: {
          sourceTerm: term.sourceTerm,
          targetTerm: term.targetTerm,
          targetAlternatives,
          location: "CONTENT",
          sourceSegmentIndex: sourceSegment.segmentIndex,
          translationSegmentIndex: translatedSegment?.segmentIndex ?? null,
          sourceExcerpt: sourceSegment.content.slice(0, 1_000),
          translatedExcerpt: translatedText.slice(0, 1_000) || null,
          currentText: safeCurrentText,
          suggestedText: safeSuggestedText,
          mappingConfidence: segmentText(source).length === translatedSegments.length ? "HIGH" : "APPROXIMATE",
        },
      });
    }
  }

  return issues;
}

export function parseProviderTranslation(value: string): { title: string; content: string } {
  const trimmed = value.trim();
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = JSON.parse(fenced) as unknown;
  if (!parsed || typeof parsed !== "object") throw new Error("Provider returned a non-object response");
  const title = "title" in parsed && typeof parsed.title === "string" ? parsed.title.trim() : "";
  const content = "content" in parsed && typeof parsed.content === "string" ? parsed.content.trim() : "";
  if (!title || !content) throw new Error("Provider response must contain non-empty title and content");
  return { title, content };
}
