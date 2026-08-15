"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const READER_THEMES = ["light", "sepia", "dark", "amoled"] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];

export const READER_THEME_LABELS: Record<ReaderTheme, string> = {
  light: "สว่าง",
  sepia: "กระดาษ",
  dark: "มืด",
  amoled: "OLED",
};

export type ReaderThemeValues = {
  bg: string;
  paper: string;
  fg: string;
  accent: string;
  action: string;
  scheme: "light" | "dark";
};

export const READER_THEME_VALUES: Record<ReaderTheme, ReaderThemeValues> = {
  light: { bg: "#FAFAF8", paper: "#FAFAF8", fg: "#242220", accent: "#B51F32", action: "#B51F32", scheme: "light" },
  sepia: { bg: "#F4EEE2", paper: "#F4EEE2", fg: "#302C28", accent: "#B51F32", action: "#B51F32", scheme: "light" },
  dark: { bg: "#111113", paper: "#111113", fg: "#E8E5E1", accent: "#E24A5B", action: "#B51F32", scheme: "dark" },
  amoled: { bg: "#000000", paper: "#090909", fg: "#F0EDE9", accent: "#FF6171", action: "#B51F32", scheme: "dark" },
};

export const READER_THEME_SWATCH: Record<ReaderTheme, { bg: string; fg: string }> = Object.fromEntries(
  READER_THEMES.map((theme) => [theme, { bg: READER_THEME_VALUES[theme].bg, fg: READER_THEME_VALUES[theme].fg }]),
) as Record<ReaderTheme, { bg: string; fg: string }>;

export const READER_FONTS = ["looped", "anuphan", "serif"] as const;
export type ReaderFont = (typeof READER_FONTS)[number];

export const READER_FONT_LABELS: Record<ReaderFont, string> = {
  looped: "อ่านสบาย",
  anuphan: "โมเดิร์น",
  serif: "Serif",
};

export type ReaderLineHeight = "tight" | "normal" | "airy";
export type ReaderWidth = "narrow" | "normal" | "wide";

export const LINE_HEIGHT_VALUES: Record<ReaderLineHeight, number> = {
  tight: 1.7,
  normal: 1.8,
  airy: 2,
};

export const WIDTH_VALUES: Record<ReaderWidth, string> = {
  narrow: "580px",
  normal: "720px",
  wide: "760px",
};

export const FONT_SIZE_MIN = 14;
export const FONT_SIZE_MAX = 28;
export const FONT_SIZE_STEP = 2;

export type ReaderPrefs = {
  theme: ReaderTheme;
  font: ReaderFont;
  fontSize: number;
  lineHeight: ReaderLineHeight;
  width: ReaderWidth;
  paragraphGap: number;
  dim: number;
  keepScreenAwake: boolean;
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "sepia",
  font: "looped",
  fontSize: 18,
  lineHeight: "normal",
  width: "normal",
  paragraphGap: 0.78,
  dim: 0,
  keepScreenAwake: false,
};

export type LocalReadingProgress = {
  novelId?: string;
  novelSlug: string;
  novelTitle: string;
  cover: string;
  chapterId?: string;
  chapterNumber: number;
  chapterTitle: string;
  chapterSortOrder: number;
  progressPercent: number;
  position: number;
  anchor?: string;
  updatedAt: number;
};

type ReaderState = {
  prefs: ReaderPrefs;
  sidebarOpen: boolean;
  localProgress: Record<string, LocalReadingProgress>;
  hasHydrated: boolean;
  setPrefs: (patch: Partial<ReaderPrefs>) => void;
  resetPrefs: () => void;
  setSidebarOpen: (open: boolean) => void;
  saveLocalProgress: (progress: LocalReadingProgress) => void;
  removeLocalProgress: (novelSlug: string) => void;
  markHydrated: () => void;
};

const MAX_LOCAL_PROGRESS_RECORDS = 40;
const NAVIGATION_KEY = "niyainow-reader-navigation";

function boundedProgress(records: Record<string, LocalReadingProgress>) {
  return Object.fromEntries(
    Object.entries(records)
      .sort(([, left], [, right]) => right.updatedAt - left.updatedAt)
      .slice(0, MAX_LOCAL_PROGRESS_RECORDS),
  );
}

export function selectLatestLocalProgress(records: Record<string, LocalReadingProgress>) {
  return Object.values(records).reduce<LocalReadingProgress | null>(
    (latest, item) => !latest || item.updatedAt > latest.updatedAt ? item : latest,
    null,
  );
}

export type ReadingPositionCandidate = {
  chapterNumber: number;
  chapterTitle?: string;
  progressPercent: number;
  position: number;
  updatedAt: number;
  anchor?: string;
};

export type NovelResumeSelection = {
  source: "local" | "server";
  progress: ReadingPositionCandidate;
};

/** Resolve a novel-level resume destination without assuming both records point at the same chapter. */
export function selectNovelResumeProgress({
  local,
  server,
}: {
  local?: ReadingPositionCandidate | null;
  server?: ReadingPositionCandidate | null;
}): NovelResumeSelection | null {
  if (!local && !server) return null;
  if (!local) return { source: "server", progress: server! };
  if (!server || local.updatedAt >= server.updatedAt) return { source: "local", progress: local };
  return { source: "server", progress: server };
}

/** Prefer the freshest record, but never restore a position from another chapter. */
export function selectReadingPosition({
  local,
  server,
  chapterNumber,
}: {
  local?: ReadingPositionCandidate | null;
  server?: ReadingPositionCandidate | null;
  chapterNumber: number;
}) {
  const localCandidate = local?.chapterNumber === chapterNumber ? local : null;
  const serverCandidate = server?.chapterNumber === chapterNumber ? server : null;
  if (!localCandidate) return serverCandidate;
  if (!serverCandidate) return localCandidate;
  return localCandidate.updatedAt >= serverCandidate.updatedAt ? localCandidate : serverCandidate;
}

export function markChapterNavigation(novelSlug: string, chapterNumber: number) {
  try {
    sessionStorage.setItem(NAVIGATION_KEY, JSON.stringify({ novelSlug, chapterNumber }));
  } catch {
    // Storage may be unavailable in strict/private browser contexts.
  }
}

export function consumeChapterNavigation(novelSlug: string, chapterNumber: number) {
  try {
    const value = sessionStorage.getItem(NAVIGATION_KEY);
    if (!value) return false;
    sessionStorage.removeItem(NAVIGATION_KEY);
    const parsed = JSON.parse(value) as { novelSlug?: string; chapterNumber?: number };
    return parsed.novelSlug === novelSlug && parsed.chapterNumber === chapterNumber;
  } catch {
    return false;
  }
}

/**
 * Browser persistence owns presentation preferences and a bounded local reading
 * fallback only. Account identity, follows, library state, and entitlements
 * remain server-owned. Ephemeral UI such as the open chapter drawer is not
 * persisted, so a new reading session always starts calm.
 */
export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_PREFS,
      sidebarOpen: false,
      localProgress: {},
      hasHydrated: false,
      setPrefs: (patch) => set((state) => ({ prefs: { ...state.prefs, ...patch } })),
      resetPrefs: () => set({ prefs: DEFAULT_PREFS }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      saveLocalProgress: (progress) => set((state) => ({
        localProgress: boundedProgress({ ...state.localProgress, [progress.novelSlug]: progress }),
      })),
      removeLocalProgress: (novelSlug) => set((state) => {
        const localProgress = { ...state.localProgress };
        delete localProgress[novelSlug];
        return { localProgress };
      }),
      markHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "niyainow-reader",
      version: 5,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as {
          prefs?: Omit<Partial<ReaderPrefs>, "theme" | "font"> & {
            theme?: ReaderTheme | "mist";
            font?: ReaderFont | "sarabun";
          };
          fontSize?: number;
          localProgress?: Record<string, LocalReadingProgress>;
        };
        const theme = state.prefs?.theme === "mist" ? "sepia" : state.prefs?.theme;
        const font = state.prefs?.font === "sarabun" ? "looped" : state.prefs?.font;
        return {
          prefs: {
            ...DEFAULT_PREFS,
            ...(state.prefs ?? {}),
            theme: theme && READER_THEMES.includes(theme) ? theme : DEFAULT_PREFS.theme,
            font: font && READER_FONTS.includes(font) ? font : DEFAULT_PREFS.font,
            fontSize: state.prefs?.fontSize ?? state.fontSize ?? DEFAULT_PREFS.fontSize,
          },
          localProgress: boundedProgress(state.localProgress ?? {}),
        };
      },
      partialize: (state) => ({ prefs: state.prefs, localProgress: state.localProgress }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
