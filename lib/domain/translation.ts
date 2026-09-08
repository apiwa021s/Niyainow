import { createHash } from "node:crypto";

export type TranslationQaIssue = {
  code: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  message: string;
  metadata?: Record<string, unknown>;
};

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
    if (source.toLocaleLowerCase().includes(term.sourceTerm.toLocaleLowerCase()) && !translation.includes(term.targetTerm)) {
      issues.push({
        code: "LOCKED_GLOSSARY_MISSING",
        severity: "CRITICAL",
        message: `ไม่พบคำศัพท์ที่ล็อกไว้: ${term.targetTerm}`,
        metadata: { sourceTerm: term.sourceTerm, targetTerm: term.targetTerm },
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
