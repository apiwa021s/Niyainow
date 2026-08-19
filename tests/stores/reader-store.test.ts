import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFS,
  FONT_SIZE_SCALE,
  normalizeReaderPrefs,
  selectLatestLocalProgress,
  selectNovelResumeProgress,
  selectReadingPosition,
  type LocalReadingProgress,
} from "@/stores/use-reader-store";

function localProgress(overrides: Partial<LocalReadingProgress> = {}): LocalReadingProgress {
  return {
    novelSlug: "story",
    novelTitle: "เรื่องทดสอบ",
    cover: "/cover.jpg",
    chapterNumber: 7,
    chapterTitle: "ตอนที่เจ็ด",
    chapterSortOrder: 7,
    progressPercent: 42,
    position: 900,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("reader preference normalisation", () => {
  it("carries a pre-v6 px size onto the nearest step of the scale", () => {
    // 18px was the old default; it is a real step now, so nobody moves.
    expect(normalizeReaderPrefs({ fontSize: 18 }).fontSizeIndex).toBe(FONT_SIZE_SCALE.indexOf(18));
    // 26px was reachable on the old even-numbered scale but is not a step now.
    expect(FONT_SIZE_SCALE[normalizeReaderPrefs({ fontSize: 26 }).fontSizeIndex]).toBe(24);
    // Out of range in either direction clamps rather than resetting.
    expect(FONT_SIZE_SCALE[normalizeReaderPrefs({ fontSize: 9 }).fontSizeIndex]).toBe(16);
    expect(FONT_SIZE_SCALE[normalizeReaderPrefs({ fontSize: 99 }).fontSizeIndex]).toBe(28);
  });

  it("renames retired faces instead of dropping the reader back to the default", () => {
    expect(normalizeReaderPrefs({ font: "anuphan" }).font).toBe("loopless");
    expect(normalizeReaderPrefs({ theme: "mist" }).theme).toBe("sepia");
  });

  it("clamps dimming to a level every theme still passes AA at", () => {
    expect(normalizeReaderPrefs({ dim: 0.9 }).dim).toBe(0.35);
    expect(normalizeReaderPrefs({ dim: -1 }).dim).toBe(0);
  });

  it("falls back to the defaults for anything unrecognisable", () => {
    expect(normalizeReaderPrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(normalizeReaderPrefs({ theme: "neon", width: "huge" })).toEqual(DEFAULT_PREFS);
  });
});

describe("reader progress selection", () => {
  it("selects the latest local novel record for the guest continue card", () => {
    const latest = localProgress({ novelSlug: "latest", chapterNumber: 12, updatedAt: 2_000 });
    expect(selectLatestLocalProgress({ old: localProgress(), latest })).toBe(latest);
  });

  it("prefers the freshest position for the requested chapter", () => {
    const local = localProgress({ updatedAt: 3_000, anchor: "paragraph:4" });
    const olderServer = { chapterNumber: 7, progressPercent: 20, position: 400, updatedAt: 2_000 };
    expect(selectReadingPosition({ local, server: olderServer, chapterNumber: 7 })).toBe(local);

    const newerServer = { ...olderServer, updatedAt: 4_000 };
    expect(selectReadingPosition({ local, server: newerServer, chapterNumber: 7 })).toBe(newerServer);
  });

  it("selects a fresher local chapter as the novel-level resume destination", () => {
    const local = localProgress({ chapterNumber: 12, updatedAt: 4_000 });
    const server = { chapterNumber: 7, progressPercent: 80, position: 1_200, updatedAt: 3_000 };

    expect(selectNovelResumeProgress({ local, server })).toEqual({ source: "local", progress: local });
    expect(selectNovelResumeProgress({ local: null, server })).toEqual({ source: "server", progress: server });
  });

  it("never restores a saved position from a different chapter", () => {
    const wrongLocal = localProgress({ chapterNumber: 6, updatedAt: 9_000 });
    const server = { chapterNumber: 7, progressPercent: 25, position: 500, updatedAt: 1_000 };
    expect(selectReadingPosition({ local: wrongLocal, server, chapterNumber: 7 })).toBe(server);
    expect(selectReadingPosition({ local: wrongLocal, server: null, chapterNumber: 7 })).toBeNull();
  });
});
