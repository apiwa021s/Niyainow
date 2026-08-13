"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadingRecord } from "@/types/novel";

/** ธีมหน้าอ่าน 5 ธีม (ส่วนที่ 2) — แยกจากธีม light/dark ของตัวเว็บ */
export const READER_THEMES = ["light", "sepia", "mist", "dark", "amoled"] as const;
export type ReaderTheme = (typeof READER_THEMES)[number];

export const READER_THEME_LABELS: Record<ReaderTheme, string> = {
  light: "สว่าง",
  sepia: "ถนอมสายตา",
  mist: "ม่วงจาง",
  dark: "มืด",
  amoled: "ดำสนิท"
};

/** สีตัวอย่างของปุ่มเลือกธีม — ตรงกับ .reader-theme-* ใน globals.css */
export const READER_THEME_SWATCH: Record<ReaderTheme, { bg: string; fg: string }> = {
  light: { bg: "#FFFFFF", fg: "#1A1030" },
  sepia: { bg: "#F6EDDC", fg: "#3A2E1E" },
  mist: { bg: "#EDEAF3", fg: "#241547" },
  dark: { bg: "#1A1030", fg: "#DDD6EB" },
  amoled: { bg: "#000000", fg: "#C9C2D9" }
};

/** ตัวเลือก body font 4 ตัว (ส่วนที่ 3) */
export const READER_FONTS = ["looped", "sarabun", "anuphan", "serif"] as const;
export type ReaderFont = (typeof READER_FONTS)[number];

export const READER_FONT_LABELS: Record<ReaderFont, string> = {
  looped: "IBM Plex Sans Thai Looped",
  sarabun: "Sarabun",
  anuphan: "Anuphan",
  serif: "Noto Serif Thai"
};

export type ReaderLineHeight = "tight" | "normal" | "airy";
export type ReaderWidth = "narrow" | "normal" | "wide";

/** line-height ขั้นต่ำ 1.85 เสมอ — ต่ำกว่านี้สระ/วรรณยุกต์ไทยชนกัน (ส่วนที่ 3, ส่วนที่ 11) */
export const LINE_HEIGHT_VALUES: Record<ReaderLineHeight, number> = {
  tight: 1.85,
  normal: 1.95,
  airy: 2.25
};

/** 34–42 ตัวอักษรไทยต่อบรรทัด ที่ 18px ≈ 680px (ส่วนที่ 3) */
export const WIDTH_VALUES: Record<ReaderWidth, string> = {
  narrow: "560px",
  normal: "680px",
  wide: "820px"
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
  /** overlay ดำโปร่งใสสำหรับอ่านกลางคืน 0–0.6 */
  dim: number;
  continuousScroll: boolean;
  keepScreenAwake: boolean;
  showInlineComments: boolean;
};

export const DEFAULT_PREFS: ReaderPrefs = {
  theme: "sepia",
  font: "looped",
  fontSize: 18,
  lineHeight: "normal",
  width: "normal",
  paragraphGap: 1,
  dim: 0,
  continuousScroll: true,
  keepScreenAwake: false,
  showInlineComments: false
};

type UserState = {
  isLoggedIn: boolean;
  name: string;
  follows: string[];
  bookmarks: string[];
  completed: string[];
  history: ReadingRecord[];

  /** ระบบเหรียญ (mock — ส่วนที่ 6.11) */
  coins: number;
  /** คีย์ `${novelSlug}:${chapterNumber}` ของตอนที่ปลดล็อกแล้ว */
  unlockedChapters: string[];

  prefs: ReaderPrefs;

  login: (name: string) => void;
  logout: () => void;
  toggleFollow: (slug: string) => void;
  toggleBookmark: (slug: string) => void;
  markCompleted: (slug: string) => void;
  saveProgress: (record: ReadingRecord) => void;

  setPrefs: (patch: Partial<ReaderPrefs>) => void;
  resetPrefs: () => void;

  addCoins: (amount: number) => void;
  /** คืน true เมื่อปลดล็อกสำเร็จ, false เมื่อเหรียญไม่พอ */
  unlockChapter: (novelSlug: string, chapter: number, price: number) => boolean;
  /** ปลดล็อกหลายตอนในราคาเหมา (แพ็กประหยัด) */
  unlockChapters: (novelSlug: string, chapters: number[], totalPrice: number) => boolean;
  isChapterUnlocked: (novelSlug: string, chapter: number) => boolean;
};

const chapterKey = (slug: string, chapter: number) => `${slug}:${chapter}`;

/** ส่วนของ state ที่ persist ลง localStorage (ตรงกับ partialize ด้านล่าง) */
type PersistedState = Pick<
  UserState,
  "isLoggedIn" | "name" | "follows" | "bookmarks" | "completed" | "history" | "coins" | "unlockedChapters" | "prefs"
>;

export const useReaderStore = create<UserState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      name: "นักอ่าน NiyaiNow",
      follows: [],
      bookmarks: [],
      completed: [],
      history: [],
      coins: 120,
      unlockedChapters: [],
      prefs: DEFAULT_PREFS,

      login: (name) => set({ isLoggedIn: true, name }),
      logout: () => set({ isLoggedIn: false }),
      toggleFollow: (slug) =>
        set((state) => ({
          follows: state.follows.includes(slug) ? state.follows.filter((item) => item !== slug) : [slug, ...state.follows]
        })),
      toggleBookmark: (slug) =>
        set((state) => ({
          bookmarks: state.bookmarks.includes(slug) ? state.bookmarks.filter((item) => item !== slug) : [slug, ...state.bookmarks]
        })),
      markCompleted: (slug) =>
        set((state) => ({
          completed: state.completed.includes(slug) ? state.completed : [slug, ...state.completed]
        })),
      saveProgress: (record) =>
        set((state) => ({
          history: [record, ...state.history.filter((item) => item.novelSlug !== record.novelSlug)].slice(0, 20)
        })),

      setPrefs: (patch) => set((state) => ({ prefs: { ...state.prefs, ...patch } })),
      resetPrefs: () => set({ prefs: DEFAULT_PREFS }),

      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),

      unlockChapter: (novelSlug, chapter, price) => {
        const state = get();
        const key = chapterKey(novelSlug, chapter);
        if (state.unlockedChapters.includes(key)) return true;
        if (state.coins < price) return false;
        set({ coins: state.coins - price, unlockedChapters: [key, ...state.unlockedChapters] });
        return true;
      },

      unlockChapters: (novelSlug, chapterNumbers, totalPrice) => {
        const state = get();
        const keys = chapterNumbers.map((chapter) => chapterKey(novelSlug, chapter));
        const missing = keys.filter((key) => !state.unlockedChapters.includes(key));
        if (missing.length === 0) return true;
        if (state.coins < totalPrice) return false;
        set({ coins: state.coins - totalPrice, unlockedChapters: [...missing, ...state.unlockedChapters] });
        return true;
      },

      isChapterUnlocked: (novelSlug, chapter) => get().unlockedChapters.includes(chapterKey(novelSlug, chapter))
    }),
    {
      name: "niyainow-reader",
      version: 2,
      // v1 เก็บ fontSize ไว้ที่ระดับบนสุด — ย้ายเข้า prefs
      migrate: (persisted) => {
        const state = (persisted ?? {}) as Partial<PersistedState> & { fontSize?: number };
        return {
          isLoggedIn: state.isLoggedIn ?? false,
          name: state.name ?? "นักอ่าน NiyaiNow",
          follows: state.follows ?? [],
          bookmarks: state.bookmarks ?? [],
          completed: state.completed ?? [],
          history: state.history ?? [],
          coins: state.coins ?? 120,
          unlockedChapters: state.unlockedChapters ?? [],
          prefs: { ...DEFAULT_PREFS, ...(state.prefs ?? {}), fontSize: state.prefs?.fontSize ?? state.fontSize ?? DEFAULT_PREFS.fontSize }
        };
      },
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        name: state.name,
        follows: state.follows,
        bookmarks: state.bookmarks,
        completed: state.completed,
        history: state.history,
        coins: state.coins,
        unlockedChapters: state.unlockedChapters,
        prefs: state.prefs
      })
    }
  )
);
