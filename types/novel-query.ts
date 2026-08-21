import type { NovelStatus } from "@/types/novel";

export type NovelSort = "popular" | "updated" | "rating" | "new" | "chapters";
export type ChapterRange = "under-50" | "50-200" | "200-500" | "500+" | "all";
export type RatingFilter = "4.5" | "4" | "3.5" | "all";
export type UpdatedFilter = "today" | "7d" | "30d" | "all";
export type ContentFilter = "free" | "paid" | "all";

export type NovelQuery = {
  genre?: string;
  tag?: string;
  status?: NovelStatus | "all";
  rating?: RatingFilter;
  chapters?: ChapterRange;
  updated?: UpdatedFilter;
  content?: ContentFilter;
  sort?: NovelSort;
  q?: string;
  page?: string | number;
  /** New reader taxonomy (mock/presentational — see lib/domain/reader-taste.ts). */
  relationship?: string;
  setting?: string;
  trope?: string;
  heat?: string;
};

export const parseGenreParam = (value?: string) =>
  value ? [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].slice(0, 8) : [];

export const parsePositivePage = (value?: string | number) => {
  const page = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(page) && page > 0 ? Math.min(page, 10_000) : 1;
};

export const BROWSE_PAGE_SIZE = 18;
export const CHAPTER_PAGE_SIZE = 50;
