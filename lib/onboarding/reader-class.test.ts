import { describe, expect, it } from "vitest";

import {
  READER_CLASSES,
  hiddenTraitFor,
  parseReaderClassProfile,
  rankSelectedClasses,
} from "./reader-class";

describe("reader class onboarding", () => {
  it("keeps the twelve public classes mapped to artwork", () => {
    expect(READER_CLASSES).toHaveLength(12);
    expect(READER_CLASSES.every((readerClass) => readerClass.image.startsWith("/Images/classs/"))).toBe(true);
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
});
