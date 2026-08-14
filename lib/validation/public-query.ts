import type { NovelQuery } from "@/types/novel-query";

export type RawSearchParams = Record<string, string | string[] | undefined>;
export type UpdateRange = "today" | "yesterday" | "week" | "all";
export type CanonicalUpdatesQuery = { range: UpdateRange; genre?: string };

const NOVEL_STATUS_VALUES = ["ongoing", "completed", "hiatus"] as const;
const RATING_VALUES = ["4.5", "4", "3.5"] as const;
const CHAPTER_VALUES = ["under-50", "50-200", "200-500", "500+"] as const;
const UPDATED_VALUES = ["today", "7d", "30d"] as const;
const CONTENT_VALUES = ["free", "paid"] as const;
const SORT_VALUES = ["popular", "updated", "rating", "new", "chapters"] as const;
const UPDATE_RANGE_VALUES = ["today", "yesterday", "week", "all"] as const;
const MAX_QUERY_LENGTH = 100;
const MAX_TAG_LENGTH = 120;
const MAX_GENRE_INPUT_LENGTH = 500;
const MAX_PAGE = 10_000;
const MAX_GENRES = 8;

function scalar(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function normalizedEnum<const TValue extends string>(
  value: string | string[] | undefined,
  allowed: readonly TValue[],
) {
  const candidate = scalar(value)?.trim().toLowerCase();
  return candidate && allowed.includes(candidate as TValue) ? (candidate as TValue) : undefined;
}

function normalizedText(value: string | string[] | undefined, maximum: number) {
  const candidate = scalar(value)?.replace(/\s+/gu, " ").trim().slice(0, maximum).trim();
  return candidate || undefined;
}

function normalizedPage(value: string | string[] | undefined) {
  const parsed = Number(scalar(value));
  if (!Number.isSafeInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, MAX_PAGE);
}

function requestedGenres(value: string | string[] | undefined) {
  const values = (typeof value === "string" ? [value] : Array.isArray(value) ? value : [])
    .slice(0, MAX_GENRES * 2);
  return new Set(
    values
      .flatMap((item) => item.slice(0, MAX_GENRE_INPUT_LENGTH).split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizedGenres(value: string | string[] | undefined, activeGenreSlugs: readonly string[]) {
  const requested = requestedGenres(value);
  const selected = [...new Set(activeGenreSlugs)]
    .filter((slug) => requested.has(slug))
    .slice(0, MAX_GENRES);
  return selected.length > 0 ? selected.join(",") : undefined;
}

/** A bounded candidate only; callers still need to verify that the tag is active. */
export function normalizeTagCandidate(value: string | string[] | undefined) {
  const candidate = scalar(value)?.trim().toLowerCase();
  if (!candidate || candidate.length > MAX_TAG_LENGTH) return undefined;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) ? candidate : undefined;
}

function appendNovelParams(params: URLSearchParams, query: NovelQuery) {
  if (query.q) params.set("q", String(query.q));
  if (query.genre) params.set("genre", String(query.genre));
  if (query.tag) params.set("tag", String(query.tag));
  if (query.status) params.set("status", String(query.status));
  if (query.rating) params.set("rating", String(query.rating));
  if (query.chapters) params.set("chapters", String(query.chapters));
  if (query.updated) params.set("updated", String(query.updated));
  if (query.content) params.set("content", String(query.content));
  if (query.sort) params.set("sort", String(query.sort));
  if (query.page && Number(query.page) > 1) params.set("page", String(query.page));
}

function href(pathname: string, params: URLSearchParams) {
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function rawSearchParamsHref(pathname: string, raw: RawSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (value !== undefined) {
      params.set(key, value);
    }
  }
  return href(pathname, params);
}

export function canonicalizeNovelSearchParams(
  raw: RawSearchParams,
  options: { activeGenreSlugs: readonly string[]; activeTagSlug?: string },
) {
  const tagCandidate = normalizeTagCandidate(raw.tag);
  const status = normalizedEnum(raw.status, NOVEL_STATUS_VALUES);
  const rating = normalizedEnum(raw.rating, RATING_VALUES);
  const chapters = normalizedEnum(raw.chapters, CHAPTER_VALUES);
  const updated = normalizedEnum(raw.updated, UPDATED_VALUES);
  const content = normalizedEnum(raw.content, CONTENT_VALUES);
  const sort = normalizedEnum(raw.sort, SORT_VALUES);
  const page = normalizedPage(raw.page);
  const q = normalizedText(raw.q, MAX_QUERY_LENGTH);
  const genre = normalizedGenres(raw.genre, options.activeGenreSlugs);
  const query: NovelQuery = {
    ...(q ? { q } : {}),
    ...(genre ? { genre } : {}),
    ...(tagCandidate && tagCandidate === options.activeTagSlug ? { tag: tagCandidate } : {}),
    ...(status ? { status } : {}),
    ...(rating ? { rating } : {}),
    ...(chapters ? { chapters } : {}),
    ...(updated ? { updated } : {}),
    ...(content ? { content } : {}),
    ...(sort && sort !== "popular" ? { sort } : {}),
    ...(page > 1 ? { page } : {}),
  };
  const params = new URLSearchParams();
  appendNovelParams(params, query);
  const canonicalHref = href("/novels", params);

  return {
    query,
    href: canonicalHref,
    isCanonical: rawSearchParamsHref("/novels", raw) === canonicalHref,
  };
}

export function novelBrowseHref(
  query: NovelQuery,
  activeGenreSlugs: readonly string[] = [...requestedGenres(query.genre ? String(query.genre) : undefined)],
) {
  const raw: RawSearchParams = Object.fromEntries(
    Object.entries(query).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, String(value)]],
    ),
  );
  return canonicalizeNovelSearchParams(raw, {
    activeGenreSlugs,
    activeTagSlug: normalizeTagCandidate(raw.tag),
  }).href;
}

export function canonicalizeUpdatesSearchParams(raw: RawSearchParams, activeGenreSlugs: readonly string[]) {
  const range = normalizedEnum(raw.range, UPDATE_RANGE_VALUES) ?? "all";
  const requestedGenre = normalizedGenres(raw.genre, activeGenreSlugs)?.split(",")[0];
  const query: CanonicalUpdatesQuery = {
    range,
    ...(requestedGenre ? { genre: requestedGenre } : {}),
  };
  const params = new URLSearchParams();
  if (query.range !== "all") params.set("range", query.range);
  if (query.genre) params.set("genre", query.genre);
  const canonicalHref = href("/updates", params);

  return {
    query,
    href: canonicalHref,
    isCanonical: rawSearchParamsHref("/updates", raw) === canonicalHref,
  };
}

export function updatesHref(query: CanonicalUpdatesQuery, activeGenreSlugs: readonly string[] = []) {
  const raw: RawSearchParams = {
    range: query.range,
    ...(query.genre ? { genre: query.genre } : {}),
  };
  const active = activeGenreSlugs.length > 0 ? activeGenreSlugs : query.genre ? [query.genre] : [];
  return canonicalizeUpdatesSearchParams(raw, active).href;
}
