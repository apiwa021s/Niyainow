import { chapters, genres, novels, popularTags, updates } from "@/data/mock-data";
import type { Chapter, Genre, Novel, NovelStatus, SearchResultGroup, UpdateItem } from "@/types/novel";

export type NovelSort = "popular" | "updated" | "rating" | "new" | "chapters";
export type ChapterRange = "under-50" | "50-200" | "200-500" | "500+" | "all";
export type RatingFilter = "4.5" | "4" | "3.5" | "all";
export type UpdatedFilter = "today" | "7d" | "30d" | "all";
export type ContentFilter = "free" | "paid" | "all";

/** ทุกตัวกรอง sync กับ URL query เพื่อแชร์ลิงก์ได้ + SEO (ส่วนที่ 6.4) */
export type NovelQuery = {
  /** หลายแนวพร้อมกัน — ใน URL คั่นด้วยจุลภาค */
  genre?: string;
  tag?: string;
  status?: NovelStatus | "all";
  rating?: RatingFilter;
  chapters?: ChapterRange;
  updated?: UpdatedFilter;
  content?: ContentFilter;
  sort?: NovelSort;
  q?: string;
};

export const parseGenreParam = (value?: string) => (value ? value.split(",").filter(Boolean) : []);

function matchesQuery(novel: Novel, q?: string) {
  if (!q) return true;
  const term = q.toLowerCase();
  return [
    novel.title,
    novel.thaiTitle,
    novel.author,
    ...novel.genres,
    ...novel.tags
  ].some((value) => value.toLowerCase().includes(term));
}

function withinChapterRange(novel: Novel, range?: ChapterRange) {
  if (!range || range === "all") return true;
  if (range === "under-50") return novel.chapters < 50;
  if (range === "50-200") return novel.chapters >= 50 && novel.chapters <= 200;
  if (range === "200-500") return novel.chapters > 200 && novel.chapters <= 500;
  return novel.chapters > 500;
}

function withinUpdatedRange(novel: Novel, range?: UpdatedFilter) {
  if (!range || range === "all") return true;
  const hours = novel.updatedHoursAgo ?? Number.POSITIVE_INFINITY;
  if (range === "today") return hours <= 24;
  if (range === "7d") return hours <= 24 * 7;
  return hours <= 24 * 30;
}

function matchesContent(novel: Novel, content?: ContentFilter) {
  if (!content || content === "all") return true;
  return content === "paid" ? Boolean(novel.hasPaidChapters) : !novel.hasPaidChapters;
}

export function getNovels(query: NovelQuery = {}) {
  const selectedGenres = parseGenreParam(query.genre);

  const filtered = novels
    // หลายแนว = OR (เลือกแฟนตาซี+โรแมนซ์ ควรเห็นทั้งสองแนว ไม่ใช่เฉพาะเรื่องที่เป็นทั้งคู่)
    .filter((novel) => selectedGenres.length === 0 || selectedGenres.some((slug) => novel.genres.includes(slug)))
    .filter((novel) => !query.tag || novel.tags.map((tag) => tag.toLowerCase()).includes(query.tag.toLowerCase()))
    .filter((novel) => !query.status || query.status === "all" || novel.status === query.status)
    .filter((novel) => !query.rating || query.rating === "all" || novel.rating >= Number(query.rating))
    .filter((novel) => withinChapterRange(novel, query.chapters))
    .filter((novel) => withinUpdatedRange(novel, query.updated))
    .filter((novel) => matchesContent(novel, query.content))
    .filter((novel) => matchesQuery(novel, query.q));

  return [...filtered].sort((a, b) => {
    if (query.sort === "rating") return b.rating - a.rating;
    if (query.sort === "chapters") return b.chapters - a.chapters;
    if (query.sort === "updated") return (a.updatedHoursAgo ?? 1e9) - (b.updatedHoursAgo ?? 1e9);
    if (query.sort === "new") return Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || b.rating - a.rating;
    return b.views - a.views;
  });
}

/** จำนวนเรื่องต่อแนว ตามตัวกรองอื่นที่เลือกอยู่ — ใช้โชว์ในวงเล็บบน chip (ส่วนที่ 6.4) */
export function getGenreFacets(query: NovelQuery = {}) {
  const base = getNovels({ ...query, genre: undefined });
  return genres.map((genre) => ({
    ...genre,
    matches: base.filter((novel) => novel.genres.includes(genre.slug)).length
  }));
}

export function getNovelBySlug(slug: string) {
  return novels.find((novel) => novel.slug === slug);
}

export function getFeaturedNovels() {
  return novels.filter((novel) => novel.featured);
}

export function getRecommendedNovels(limit = 12) {
  return [...novels].sort((a, b) => b.rating - a.rating).slice(0, limit);
}

export function getRankings() {
  return [...novels].sort((a, b) => b.views + b.rating * 100000 - (a.views + a.rating * 100000));
}

export function getGenres(): Genre[] {
  return genres;
}

export function getGenreBySlug(slug: string) {
  return genres.find((genre) => genre.slug === slug);
}

export function getTags() {
  return popularTags;
}

export function getUpdates(): UpdateItem[] {
  return updates;
}

export function getNovelUpdates(slug: string) {
  return updates.filter((item) => item.novelSlug === slug);
}

export function getChapters(slug: string): Chapter[] {
  return chapters.filter((chapter) => chapter.novelSlug === slug);
}

export function getChapter(slug: string, chapter: number) {
  return chapters.find((item) => item.novelSlug === slug && item.number === chapter);
}

export function searchNovels(q: string): SearchResultGroup {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return { novels: [], genres: [], tags: [] };

  return {
    novels: getNovels({ q }),
    genres: genres.filter((genre) => [genre.name, genre.thaiName, genre.slug].some((value) => value.toLowerCase().includes(query))),
    tags: popularTags.filter((tag) => tag.toLowerCase().includes(query))
  };
}

/** มาใหม่สัปดาห์นี้ (ส่วนที่ 6.3 — ผู้ใช้ใหม่) */
export function getNewThisWeek(limit = 12) {
  const fresh = novels.filter((novel) => novel.isNew);
  const rest = novels.filter((novel) => !novel.isNew).sort((a, b) => b.rating - a.rating);
  return [...fresh, ...rest].slice(0, limit);
}

/** นิยายจบแล้ว อ่านรวดเดียวจบ (ส่วนที่ 6.3) */
export function getCompletedNovels(limit = 12) {
  return novels
    .filter((novel) => novel.status === "completed")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}

/** ตอนใหม่จากเรื่องที่ติดตาม — กรองด้วยรายการ follows ฝั่ง client */
export function getUpdatesForNovels(slugs: string[], limit = 12) {
  if (slugs.length === 0) return [];
  return updates.filter((item) => slugs.includes(item.novelSlug)).slice(0, limit);
}

/** แนวยอดนิยม พร้อมปกตัวอย่างไว้ทำการ์ดแนว (ส่วนที่ 6.3 — เลือกตามแนว) */
export function getGenreShowcase(limit = 12) {
  return genres.slice(0, limit).map((genre) => ({
    genre,
    covers: novels
      .filter((novel) => novel.genres.includes(genre.slug))
      .slice(0, 3)
      .map((novel) => novel.cover)
  }));
}

/** เรื่องที่คล้ายกัน — จัดอันดับจากจำนวนแนวที่ตรงกัน (ส่วนที่ 6.6 / 6.7) */
export function getSimilarNovels(slug: string, limit = 6): Novel[] {
  const source = getNovelBySlug(slug);
  if (!source) return [];

  return novels
    .filter((novel) => novel.slug !== slug)
    .map((novel) => ({
      novel,
      score: novel.genres.filter((genre) => source.genres.includes(genre)).length
    }))
    .sort((a, b) => b.score - a.score || b.novel.rating - a.novel.rating)
    .slice(0, limit)
    .map((entry) => entry.novel);
}

export function getAdjacentChapters(slug: string, current: number) {
  const list = getChapters(slug);
  return {
    previous: list.find((chapter) => chapter.number === current - 1),
    next: list.find((chapter) => chapter.number === current + 1)
  };
}
