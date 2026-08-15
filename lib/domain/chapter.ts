export function countChapterWords(content: string) {
  const normalized = content.trim();
  if (!normalized) return 0;

  // Intl.Segmenter handles Thai text without depending on ASCII whitespace.
  const Segmenter = Intl.Segmenter;
  const segmenter = new Segmenter("th", { granularity: "word" });
  let count = 0;
  for (const segment of segmenter.segment(normalized)) {
    if (segment.isWordLike) count += 1;
  }
  return count;
}

export function splitChapterParagraphs(content: string) {
  return content
    .replace(/\r\n?/gu, "\n")
    .split(/\n{2,}/gu)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

const chapterNumberSegment = /^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/u;

export function parseChapterNumberSegment(value: string) {
  if (!chapterNumberSegment.test(value)) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 99_999_999.99) return null;
  const canonical = String(number);
  return { number, canonical, isCanonical: value === canonical };
}

export function isPublicChapter(input: {
  status: string;
  publishedAt: Date | null;
  deletedAt?: Date | null;
}, now = new Date()) {
  return input.status === "PUBLISHED" && input.publishedAt !== null && input.publishedAt <= now && !input.deletedAt;
}
