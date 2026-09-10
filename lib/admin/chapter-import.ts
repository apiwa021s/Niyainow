export type ParsedChapterImport = {
  chapterNumber: number;
  title: string;
  content: string;
};

function defaultTitle(chapterNumber: number) {
  return `ตอนที่ ${chapterNumber}`;
}

export function parseChapterLabel(label: string, fallbackNumber: number) {
  const withoutExtension = label.replace(/\.(?:txt|md|markdown)$/iu, "").replace(/[_]+/gu, " ").trim();
  const labeled = withoutExtension.match(/(?:ตอน(?:ที่)?|chapter|ch)\s*[- ]*(\d+(?:\.\d+)?)/iu);
  const leading = withoutExtension.match(/^(\d+(?:\.\d+)?)(?:\s*[-:–—.]\s*|\s+)/u);
  const match = labeled ?? leading;
  const chapterNumber = match ? Number(match[1]) : fallbackNumber;
  const title = match
    ? withoutExtension.slice((match.index ?? 0) + match[0].length).replace(/^\s*[-:–—.]\s*/u, "").trim()
    : withoutExtension;
  return { chapterNumber, title: title || defaultTitle(chapterNumber) };
}

/**
 * Split pasted manuscripts on headings such as `ตอนที่ 12 ชื่อตอน`,
 * `Chapter 12: Title`, or `## ตอน 12 - ชื่อตอน`.
 */
export function parseCombinedChapters(source: string): ParsedChapterImport[] {
  const normalized = source.replace(/\r\n?/gu, "\n");
  const heading = /^(?:#{1,6}\s*)?(?:={2,}\s*)?(?:ตอน(?:ที่)?|chapter)\s*(\d+(?:\.\d+)?)\s*(?:[:\-–—]\s*)?(.*?)(?:\s*={2,})?\s*$/gimu;
  const matches = [...normalized.matchAll(heading)];
  return matches.map((match, index) => {
    const chapterNumber = Number(match[1]);
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd = matches[index + 1]?.index ?? normalized.length;
    return {
      chapterNumber,
      title: match[2]?.trim() || defaultTitle(chapterNumber),
      content: normalized.slice(contentStart, contentEnd).trim(),
    };
  });
}
