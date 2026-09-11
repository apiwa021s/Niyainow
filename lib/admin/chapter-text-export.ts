import { strToU8, zipSync } from "fflate";

export type ChapterTextFile = {
  chapterNumber: number;
  title: string;
  content: string;
};

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const TRAILING_DOTS_OR_SPACES = /[. ]+$/g;

function formatChapterNumber(chapterNumber: number) {
  const [integer, decimal] = String(chapterNumber).split(".");
  const paddedInteger = integer.padStart(3, "0");
  return decimal ? `${paddedInteger}.${decimal}` : paddedInteger;
}

function safeFilenamePart(value: string, fallback: string) {
  const sanitized = value
    .normalize("NFC")
    .replace(INVALID_FILENAME_CHARACTERS, "-")
    .replace(/\s+/g, " ")
    .replace(TRAILING_DOTS_OR_SPACES, "")
    .trim()
    .slice(0, 140)
    .replace(TRAILING_DOTS_OR_SPACES, "");
  return sanitized || fallback;
}

export function chapterTextFilename(chapter: Pick<ChapterTextFile, "chapterNumber" | "title">) {
  const number = formatChapterNumber(chapter.chapterNumber);
  return `${number}-${safeFilenamePart(chapter.title, `ตอน-${number}`)}.txt`;
}

export function buildChapterTextArchive(chapters: ChapterTextFile[]) {
  const files: Record<string, Uint8Array> = {};
  for (const chapter of chapters) {
    const normalizedContent = chapter.content.replace(/\r\n?/g, "\n");
    // The BOM keeps Thai text readable in Windows editors that do not auto-detect UTF-8.
    files[chapterTextFilename(chapter)] = strToU8(`\uFEFF${normalizedContent}`);
  }
  return zipSync(files, { level: 6 });
}
