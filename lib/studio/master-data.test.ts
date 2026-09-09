import { describe, expect, it } from "vitest";

import { genres as developmentGenres } from "@/data/mock-data";

import { PRIMARY_GENRES } from "./master-data";

const EXPECTED_GENRE_IDS = [
  "action",
  "adventure",
  "romance",
  "fantasy",
  "sci-fi",
  "mystery",
  "thriller",
  "horror",
  "historical",
  "contemporary",
  "drama",
  "comedy",
  "slice-of-life",
  "sports",
  "martial-arts",
  "system",
  "apocalypse",
] as const;

describe("primary genre master data", () => {
  it("contains the complete supported genre catalogue", () => {
    expect(PRIMARY_GENRES.map((genre) => genre.id)).toEqual(EXPECTED_GENRE_IDS);
    expect(developmentGenres.map((genre) => genre.slug)).toEqual(EXPECTED_GENRE_IDS);
  });

  it("has unique slugs, labels, and consecutive display order", () => {
    expect(new Set(PRIMARY_GENRES.map((genre) => genre.slug)).size).toBe(PRIMARY_GENRES.length);
    expect(new Set(PRIMARY_GENRES.map((genre) => genre.nameEn.toLocaleLowerCase("en"))).size).toBe(PRIMARY_GENRES.length);
    expect(PRIMARY_GENRES.map((genre) => genre.sortOrder)).toEqual(
      Array.from({ length: PRIMARY_GENRES.length }, (_, index) => index + 1),
    );
  });

  it("provides complete active metadata for every genre", () => {
    for (const genre of PRIMARY_GENRES) {
      expect(genre.isActive).toBe(true);
      expect(genre.nameTh.trim()).not.toBe("");
      expect(genre.nameEn.trim()).not.toBe("");
      expect(genre.descriptionTh?.trim()).not.toBe("");
      expect(genre.descriptionEn?.trim()).not.toBe("");
      expect(genre.icon?.trim()).not.toBe("");
    }
  });
});
