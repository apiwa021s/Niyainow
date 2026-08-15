"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export const READER_THEMES = ["light", "sepia", "mist", "dark", "amoled"] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];

export const READER_THEME_LABELS: Record<ReaderTheme, string> = {
  light: "ขาว",
  sepia: "กระดาษ",
  mist: "เทาอุ่น",
  dark: "มืด",
  amoled: "ดำ",
};

export const READER_THEME_SWATCH: Record<ReaderTheme, { bg: string; fg: string }> = {
  light: { bg: "#FFFFFF", fg: "#242321" },
  sepia: { bg: "#FFFCF6", fg: "#292724" },
  mist: { bg: "#F7F5F1", fg: "#292724" },
  dark: { bg: "#161616", fg: "#D8D3CB" },
  amoled: { bg: "#0F0F0F", fg: "#D0CCC5" },
};

export const READER_FONTS = ["looped", "sarabun", "anuphan", "serif"] as const;
export type ReaderFont = (typeof READER_FONTS)[number];

export const READER_FONT_LABELS: Record<ReaderFont, string> = {
  looped: "IBM Plex Sans Thai Looped",
  sarabun: "Sarabun",
  anuphan: "Anuphan",
  serif: "Noto Serif Thai",
};

export type ReaderLineHeight = "tight" | "normal" | "airy";
export type ReaderWidth = "narrow" | "normal" | "wide";

export const LINE_HEIGHT_VALUES: Record<ReaderLineHeight, number> = {
  tight: 1.85,
  normal: 1.95,
  airy: 2.25,
};

export const WIDTH_VALUES: Record<ReaderWidth, string> = {
  narrow: "560px",
  normal: "720px",
  wide: "820px",
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
  sidebarOpen: boolean;
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "sepia",
  font: "looped",
  fontSize: 18,
  lineHeight: "normal",
  width: "normal",
  paragraphGap: 1,
  dim: 0,
  keepScreenAwake: false,
  sidebarOpen: false,
};

type ReaderState = {
  prefs: ReaderPrefs;
  setPrefs: (patch: Partial<ReaderPrefs>) => void;
  resetPrefs: () => void;
};

/**
 * Only reader presentation preferences are persisted in the browser. Identity,
 * library, follows, progress, ratings, and entitlements are server-owned data.
 */
export const useReaderStore = create<ReaderState>()(
  persist(
    (set) => ({
      prefs: DEFAULT_PREFS,
      setPrefs: (patch) => set((state) => ({ prefs: { ...state.prefs, ...patch } })),
      resetPrefs: () => set({ prefs: DEFAULT_PREFS }),
    }),
    {
      name: "niyainow-reader",
      version: 4,
      migrate: (persisted) => {
        const state = (persisted ?? {}) as { prefs?: Partial<ReaderPrefs>; fontSize?: number };
        return {
          prefs: {
            ...DEFAULT_PREFS,
            ...(state.prefs ?? {}),
            fontSize: state.prefs?.fontSize ?? state.fontSize ?? DEFAULT_PREFS.fontSize,
          },
        };
      },
      partialize: (state) => ({ prefs: state.prefs }),
    },
  ),
);
