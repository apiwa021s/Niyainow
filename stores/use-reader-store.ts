"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ReadingRecord } from "@/types/novel";

type UserState = {
  isLoggedIn: boolean;
  name: string;
  follows: string[];
  bookmarks: string[];
  completed: string[];
  history: ReadingRecord[];
  fontSize: number;
  login: (name: string) => void;
  logout: () => void;
  toggleFollow: (slug: string) => void;
  toggleBookmark: (slug: string) => void;
  markCompleted: (slug: string) => void;
  saveProgress: (record: ReadingRecord) => void;
  setFontSize: (fontSize: number) => void;
};

export const useReaderStore = create<UserState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      name: "นักอ่าน NiyaiNow",
      follows: [],
      bookmarks: [],
      completed: [],
      history: [],
      fontSize: 20,
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
      setFontSize: (fontSize) => set({ fontSize })
    }),
    { name: "niyainow-reader" }
  )
);
