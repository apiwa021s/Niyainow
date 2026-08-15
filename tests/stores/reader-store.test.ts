import { describe, expect, it } from "vitest";

import {
  READER_THEME_VALUES,
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

describe("reader progress selection", () => {
  it("uses the exact Night surface and text colors across the reader canvas", () => {
    expect(READER_THEME_VALUES.dark).toMatchObject({
      bg: "#111113",
      paper: "#111113",
      fg: "#E8E5E1",
    });
  });

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
