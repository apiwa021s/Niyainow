import { chapters, genres, novels, popularTags, updates } from "@/data/mock-data";
import type { Chapter, Genre, Novel, NovelStatus, SearchResultGroup, UpdateItem } from "@/types/novel";

export type NovelQuery = {
  genre?: string;
  tag?: string;
  status?: NovelStatus | "all";
  rating?: "4" | "3" | "all";
  chapters?: "1-50" | "51-100" | "101-300" | "300+" | "all";
  sort?: "popular" | "latest" | "rating" | "updated" | "az";
  q?: string;
};

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

function withinChapterRange(novel: Novel, range?: NovelQuery["chapters"]) {
  if (!range || range === "all") return true;
  if (range === "1-50") return novel.chapters <= 50;
  if (range === "51-100") return novel.chapters >= 51 && novel.chapters <= 100;
  if (range === "101-300") return novel.chapters >= 101 && novel.chapters <= 300;
  return novel.chapters > 300;
}

export function getNovels(query: NovelQuery = {}) {
  const filtered = novels
    .filter((novel) => !query.genre || novel.genres.includes(query.genre))
    .filter((novel) => !query.tag || novel.tags.map((tag) => tag.toLowerCase()).includes(query.tag.toLowerCase()))
    .filter((novel) => !query.status || query.status === "all" || novel.status === query.status)
    .filter((novel) => !query.rating || query.rating === "all" || novel.rating >= Number(query.rating))
    .filter((novel) => withinChapterRange(novel, query.chapters))
    .filter((novel) => matchesQuery(novel, query.q));

  return [...filtered].sort((a, b) => {
    if (query.sort === "az") return a.title.localeCompare(b.title);
    if (query.sort === "rating") return b.rating - a.rating;
    if (query.sort === "latest" || query.sort === "updated") return b.chapters - a.chapters;
    return b.views - a.views;
  });
}

export function getNovelBySlug(slug: string) {
  return novels.find((novel) => novel.slug === slug);
}

export function getFeaturedNovels() {
  return novels.filter((novel) => novel.featured);
}

export function getRecommendedNovels() {
  return [...novels].sort((a, b) => b.rating - a.rating).slice(0, 6);
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

export function getAdjacentChapters(slug: string, current: number) {
  const list = getChapters(slug);
  return {
    previous: list.find((chapter) => chapter.number === current - 1),
    next: list.find((chapter) => chapter.number === current + 1)
  };
}
