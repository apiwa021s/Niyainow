"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_PREFS,
  READER_STORAGE_KEY,
  normalizeReaderPrefs,
  type ReaderPrefs,
} from "@/lib/reader/prefs";

/**
 * The scales, labels, and normalisation live in lib/reader/prefs.ts, which has
 * no "use client" directive. That matters: Server Components — the pre-paint
 * script and /dev/type-spec — need the real values, and a named export read
 * across the client boundary arrives as a reference stub instead.
 *
 * Re-exported here so existing client imports keep working unchanged.
 */
export * from "@/lib/reader/prefs";

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
      name: READER_STORAGE_KEY,
      version: 6,
      /**
       * v6 moved size from px to a scale index, renamed the "anuphan" face to
       * "loopless", and replaced the free-form paragraph gap with a two-mode
       * choice. normalizeReaderPrefs absorbs all of it, so a returning reader
       * keeps the closest equivalent of what they had rather than being reset.
       */
      migrate: (persisted) => {
        const state = (persisted ?? {}) as {
          prefs?: unknown;
          fontSize?: number;
          localProgress?: Record<string, LocalReadingProgress>;
        };
        const legacy = (state.prefs ?? {}) as Record<string, unknown>;
        return {
          prefs: normalizeReaderPrefs({
            ...legacy,
            fontSize: legacy.fontSize ?? state.fontSize,
          }),
          localProgress: boundedProgress(state.localProgress ?? {}),
        };
      },
      partialize: (state) => ({ prefs: state.prefs, localProgress: state.localProgress }),
      onRehydrateStorage: () => (state) => state?.markHydrated(),
    },
  ),
);
