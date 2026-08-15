import type { ChapterSummary } from "@/types/novel";

export type PublicChapterCachePayload = {
  chapter: ChapterSummary;
  content: string | null;
  locked: boolean;
};

/**
 * Constructs the only chapter shape allowed in shared caches. Callers must
 * supply `publicContent` from the SQL projection that replaces paid content
 * with the editorial excerpt. Extra/private source fields are never copied.
 */
export function toPublicChapterCachePayload(input: {
  chapter: ChapterSummary;
  isFree: boolean;
  publicContent: string | null;
}): PublicChapterCachePayload {
  return {
    chapter: input.chapter,
    content: input.publicContent,
    locked: !input.isFree,
  };
}
