import { describe, expect, it } from "vitest";

import {
  allocateClassExp,
  classLevelProgress,
  classTitleFor,
  expForNextLevel,
  inferClassAffinities,
  minimumActiveReadingSeconds,
  readingExpForWordCount,
  rereadMultiplierMilli,
  totalExpForLevel,
} from "./reader-rpg";

describe("reader RPG progression", () => {
  it("uses the linear level curve and reaches level 50 at 66,150 EXP", () => {
    expect(expForNextLevel(1)).toBe(150);
    expect(expForNextLevel(49)).toBe(2_550);
    expect(totalExpForLevel(50)).toBe(66_150);
    expect(classLevelProgress(66_149_999).level).toBe(49);
    expect(classLevelProgress(66_150_000)).toMatchObject({ level: 50, progressPercent: 100 });
  });

  it("changes every class title at the specified milestones", () => {
    expect(classTitleFor("martial", 1)).toBe("ผู้เริ่มฝึกตน");
    expect(classTitleFor("martial", 19)).toBe("จอมยุทธ์");
    expect(classTitleFor("martial", 20)).toBe("ปรมาจารย์");
    expect(classTitleFor("spicy", 50)).toBe("ตำนานรักหลังเที่ยงคืน");
    expect(classTitleFor("cozy", 35)).toBe("เซียนแห่งความชิล");
  });

  it("caps chapter EXP and reading-time requirements", () => {
    expect([999, 1_000, 2_500, 4_000].map(readingExpForWordCount)).toEqual([6, 10, 14, 18]);
    expect(minimumActiveReadingSeconds(0)).toBe(20);
    expect(minimumActiveReadingSeconds(4_000)).toBe(500);
    expect(minimumActiveReadingSeconds(20_000)).toBe(600);
  });

  it("reduces repeat reads to 20 percent then zero", () => {
    expect([0, 1, 2, 20].map(rereadMultiplierMilli)).toEqual([1_000, 200, 0, 0]);
  });

  it("splits fixed-point class EXP and adds only the main class bonus", () => {
    expect(allocateClassExp(10, [
      { classId: "martial", weightMilli: 600 },
      { classId: "system", weightMilli: 300 },
      { classId: "reborn", weightMilli: 100 },
    ], "martial")).toEqual([
      { classId: "martial", weightMilli: 600, expMilli: 6_600, mainClassBonusBps: 1_000 },
      { classId: "system", weightMilli: 300, expMilli: 3_000, mainClassBonusBps: 0 },
      { classId: "reborn", weightMilli: 100, expMilli: 1_000, mainClassBonusBps: 0 },
    ]);
  });

  it("creates a normalized three-class fallback affinity from genres", () => {
    const affinities = inferClassAffinities(["system", "fantasy", "action"]);
    expect(affinities).toHaveLength(3);
    expect(affinities[0].classId).toBe("system");
    expect(affinities.reduce((sum, item) => sum + item.weightMilli, 0)).toBe(1_000);
  });
});
