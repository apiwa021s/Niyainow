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
    .split(/\n[ \t]*\n+/gu)
    .map((paragraph) => normalizeSoftLineBreaks(paragraph))
    .filter(Boolean);
}

/**
 * A single newline inside a paragraph is commonly a hard-wrap left by an
 * importer or text editor, not an intentional paragraph break. Keeping it in
 * the DOM makes the browser wrap the same sentence twice: once at the stored
 * newline and again at the viewport edge. Thai runs join without an inserted
 * space; scripts that use word spaces receive one collapsed space.
 */
function normalizeSoftLineBreaks(paragraph: string) {
  const lines = paragraph.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return lines[0] ?? "";

  return lines.reduce((result, line) => {
    if (!result) return line;
    const previous = result.at(-1) ?? "";
    const next = line[0] ?? "";
    const joinsThaiRun = /\p{Script=Thai}/u.test(previous) && /\p{Script=Thai}/u.test(next);
    return `${result}${joinsThaiRun ? "" : " "}${line}`;
  }, "");
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
