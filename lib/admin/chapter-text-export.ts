import { strToU8, zipSync } from "fflate";

export type ChapterTextFile = {
  chapterNumber: number;
  title: string;
  content: string;
};

const INVALID_FILENAME_CHARACTERS = /[<>:"/\\|?*\u0000-\u001f]/g;
const TRAILING_DOTS_OR_SPACES = /[. ]+$/g;
// Windows Compressed Folders rejects UTF-8 entry names at 260 bytes, even
// when their character count is lower. Leave room below that limit.
const MAX_ZIP_ENTRY_FILENAME_BYTES = 240;

function formatChapterNumber(chapterNumber: number) {
  const [integer, decimal] = String(chapterNumber).split(".");
  const paddedInteger = integer.padStart(3, "0");
  return decimal ? `${paddedInteger}.${decimal}` : paddedInteger;
}

function safeFilenamePart(value: string, fallback: string, maxBytes: number) {
  const sanitized = value
    .normalize("NFC")
    .replace(INVALID_FILENAME_CHARACTERS, "-")
    .replace(/\s+/g, " ")
    .replace(TRAILING_DOTS_OR_SPACES, "")
    .trim();
  let filenamePart = "";
  for (const character of sanitized) {
    const next = filenamePart + character;
    if (next.length > 140 || strToU8(next).length > maxBytes) break;
    filenamePart = next;
  }
  return filenamePart.replace(TRAILING_DOTS_OR_SPACES, "").trim() || fallback;
}

export function chapterTextFilename(chapter: Pick<ChapterTextFile, "chapterNumber" | "title">) {
  const number = formatChapterNumber(chapter.chapterNumber);
  const titleByteLimit = MAX_ZIP_ENTRY_FILENAME_BYTES - strToU8(`${number}-.txt`).length;
  return `${number}-${safeFilenamePart(chapter.title, `ตอน-${number}`, titleByteLimit)}.txt`;
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
