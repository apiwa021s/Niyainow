import { describe, expect, it } from "vitest";

import {
  canonicalizeNovelSearchParams,
  canonicalizeUpdatesSearchParams,
  normalizeTagCandidate,
  novelBrowseHref,
  updatesHref,
} from "./public-query";

const activeGenres = ["action", "fantasy", "romance", "sci-fi"];

describe("public query canonicalization", () => {
  it("normalizes a novel query into finite values and stable taxonomy order", () => {
    const result = canonicalizeNovelSearchParams(
      {
        genre: [" romance,missing ", "fantasy,romance"],
        tag: " Isekai ",
        status: " ONGOING ",
        rating: "invalid",
        chapters: "all",
        updated: "7D",
        content: "free",
        sort: "UPDATED",
        q: "  dragon\n   academy  ",
        page: "10001",
        ignored: "value",
      },
      { activeGenreSlugs: activeGenres, activeTagSlug: "isekai" },
    );

    expect(result.query).toEqual({
      q: "dragon academy",
      genre: "fantasy,romance",
      tag: "isekai",
      status: "ongoing",
      updated: "7d",
      content: "free",
      sort: "updated",
      page: 10_000,
    });
    expect(result.href).toBe(
      "/novels?q=dragon+academy&genre=fantasy%2Cromance&tag=isekai&status=ongoing&updated=7d&content=free&sort=updated&page=10000",
    );
    expect(result.isCanonical).toBe(false);
  });

  it("drops unknown, duplicate scalar, invalid tag, and explicit defaults", () => {
    const result = canonicalizeNovelSearchParams(
      {
        q: ["first", "second"],
        tag: "not/a/slug",
        status: "all",
        sort: "popular",
        page: "1",
        genre: "unknown",
      },
      { activeGenreSlugs: activeGenres },
    );

    expect(result.query).toEqual({});
    expect(result.href).toBe("/novels");
    expect(result.isCanonical).toBe(false);
  });

  it("recognizes and emits the same stable canonical novel URL", () => {
    const raw = { q: "dragon academy", genre: "fantasy,romance", sort: "updated", page: "3" };
    const result = canonicalizeNovelSearchParams(raw, { activeGenreSlugs: activeGenres });

    expect(result.isCanonical).toBe(true);
    expect(novelBrowseHref(result.query, activeGenres)).toBe(result.href);
  });

  it("only exposes a bounded URL-safe candidate for active-tag resolution", () => {
    expect(normalizeTagCandidate("  Found-Family ")).toBe("found-family");
    expect(normalizeTagCandidate(["isekai", "romance"])).toBeUndefined();
    expect(normalizeTagCandidate("../isekai")).toBeUndefined();
    expect(normalizeTagCandidate("x".repeat(121))).toBeUndefined();
  });

  it("caps normalized free-text without leaving trailing whitespace", () => {
    const result = canonicalizeNovelSearchParams(
      { q: `${"x".repeat(99)}   overflow` },
      { activeGenreSlugs: activeGenres },
    );
    expect(result.query.q).toBe("x".repeat(99));
    expect(result.query.q).toHaveLength(99);
  });

  it("normalizes update range and genre with default elision", () => {
    const result = canonicalizeUpdatesSearchParams(
      { range: " WEEK ", genre: "ROMANCE", ignored: "yes" },
      activeGenres,
    );
    expect(result.query).toEqual({ range: "week", genre: "romance" });
    expect(result.href).toBe("/updates?range=week&genre=romance");
    expect(result.isCanonical).toBe(false);
    expect(updatesHref(result.query, activeGenres)).toBe(result.href);

    expect(canonicalizeUpdatesSearchParams({ range: "all", genre: "missing" }, activeGenres)).toMatchObject({
      query: { range: "all" },
      href: "/updates",
      isCanonical: false,
    });
  });
});
