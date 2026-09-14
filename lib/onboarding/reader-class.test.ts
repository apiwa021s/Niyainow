import { describe, expect, it } from "vitest";

import {
  READER_CLASS_STORAGE_KEY,
  READER_CLASSES,
  hiddenTraitFor,
  parseReaderClassProfile,
  rankSelectedClasses,
} from "./reader-class";
import { readerClassProfileInputSchema } from "./reader-class-validation";

const validStoredProfile = {
  version: 2 as const,
  classId: "martial",
  subClassId: "system",
  subClassIds: ["system", "isekai"],
  selectedClassIds: ["martial", "system", "isekai"],
  answers: { hero: "growth", pace: "binge", hook: "new_world" },
  completedAt: "2026-09-14T04:30:00.000Z",
};

describe("reader class onboarding", () => {
  it("versions the local guest fallback independently from database state", () => {
    expect(READER_CLASS_STORAGE_KEY).toBe("novelnow-reader-class:v2");
  });

  it("keeps the twelve public classes mapped to artwork", () => {
    expect(READER_CLASSES).toHaveLength(12);
    expect(READER_CLASSES.map((readerClass) => readerClass.image)).toEqual(
      Array.from({ length: 12 }, (_, index) => `/Images/classs/${String(index + 1).padStart(2, "0")}.png`),
    );
    expect(READER_CLASSES.map((readerClass) => readerClass.icon)).toEqual(
      Array.from({ length: 12 }, (_, index) => `/Images/class_icon/${String(index + 1).padStart(2, "0")}.png`),
    );
  });

  it("ranks only the three classes the reader selected", () => {
    const ranked = rankSelectedClasses(
      ["martial", "system", "romance"],
      { hero: "strategist", pace: "binge", hook: "new_world" },
    );

    expect(ranked).toEqual(["system", "martial", "romance"]);
  });

  it("derives a reading trait from reading pace", () => {
    expect(hiddenTraitFor({ pace: "binge" })).toEqual({ label: "นักโต้รุ่ง", emoji: "🌙" });
  });

  it("rejects a profile that repeats its main class as the sub class", () => {
    expect(parseReaderClassProfile(JSON.stringify({
      version: 1,
      classId: "martial",
      subClassId: "martial",
      selectedClassIds: ["martial", "system", "isekai"],
    }))).toBeNull();
  });

  it("upgrades a stored v1 profile into two sub classes", () => {
    expect(parseReaderClassProfile(JSON.stringify({
      version: 1,
      classId: "martial",
      subClassId: "system",
      selectedClassIds: ["martial", "system", "isekai"],
      answers: validStoredProfile.answers,
      completedAt: validStoredProfile.completedAt,
    }))).toMatchObject({
      version: 2,
      subClassIds: ["system", "isekai"],
    });
  });

  it("accepts a complete profile before database persistence", () => {
    expect(readerClassProfileInputSchema.safeParse(validStoredProfile).success).toBe(true);
  });

  it("rejects duplicate selections and incomplete quiz answers", () => {
    expect(readerClassProfileInputSchema.safeParse({
      ...validStoredProfile,
      selectedClassIds: ["martial", "martial", "isekai"],
      answers: { hero: "growth", pace: "binge" },
    }).success).toBe(false);
  });

  it("requires main and sub classes to be part of the selected three", () => {
    expect(readerClassProfileInputSchema.safeParse({
      ...validStoredProfile,
      subClassId: "romance",
    }).success).toBe(false);
  });
});
