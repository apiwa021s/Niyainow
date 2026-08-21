"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ChapterSaveState = "idle" | "saving" | "saved" | "error";

export type ChapterDraftValue = {
  title: string;
  content: string;
};

type StoredDraft = ChapterDraftValue & { savedAt: number };

const AUTOSAVE_DELAY_MS = 1_200;

/** Exported so the preview tab (a separate navigation, not shared client state) can read the same backup. */
export function chapterDraftStorageKey(storySlug: string, chapterKey: string) {
  return `novelnow-studio-chapter-draft:${storySlug}:${chapterKey}`;
}

function readLocalDraft(storySlug: string, chapterKey: string): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(chapterDraftStorageKey(storySlug, chapterKey));
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
}

function writeLocalDraft(storySlug: string, chapterKey: string, value: StoredDraft) {
  try {
    window.localStorage.setItem(chapterDraftStorageKey(storySlug, chapterKey), JSON.stringify(value));
  } catch {
    // Storage can be full or disabled (private browsing) — the in-memory
    // state is still correct, only the survive-a-closed-tab guarantee is lost.
  }
}

function clearLocalDraft(storySlug: string, chapterKey: string) {
  try {
    window.localStorage.removeItem(chapterDraftStorageKey(storySlug, chapterKey));
  } catch {
    // Nothing to clean up if storage was never writable.
  }
}

/**
 * Local-device backup for whatever's in the editor right now, checked against
 * "the server's" last-known version on mount. This survives a closed tab —
 * unlike the story wizard's in-memory-only draft — because losing a chapter's
 * worth of writing is a much bigger cost than losing wizard progress.
 *
 * There is no real server in this build, so `serverValue`/`serverSavedAt` are
 * whatever the mock chapter data says right now — but the shape (local vs.
 * server timestamp, no auto-merge) is exactly what plugs into a real draft
 * endpoint later.
 */
export function useChapterDraft({
  storySlug,
  chapterKey,
  serverValue,
  serverSavedAt,
}: {
  storySlug: string;
  chapterKey: string;
  serverValue: ChapterDraftValue;
  serverSavedAt: number;
}) {
  const [value, setValue] = useState<ChapterDraftValue>(serverValue);
  const [saveState, setSaveState] = useState<ChapterSaveState>("idle");
  // Lazy initializer, not an effect: `useState`'s init function is the
  // documented way to run a one-time client read on mount (the story
  // wizard's own draft hook does the same for its resumable-draft check).
  const [recoverable, setRecoverable] = useState<StoredDraft | null>(() => {
    const local = readLocalDraft(storySlug, chapterKey);
    const localDiffers = local && (local.title !== serverValue.title || local.content !== serverValue.content);
    return localDiffers && local.savedAt > serverSavedAt ? local : null;
  });
  const saveTimer = useRef<number | undefined>(undefined);
  const retryTimer = useRef<number | undefined>(undefined);
  const persistRef = useRef<(next: ChapterDraftValue) => void>(() => {});

  const persist = useCallback(
    (next: ChapterDraftValue) => {
      setSaveState("saving");
      window.clearTimeout(retryTimer.current);

      // The local backup is a synchronous browser write — it does not fail
      // the way a network save can, so it always lands immediately.
      writeLocalDraft(storySlug, chapterKey, { ...next, savedAt: Date.now() });

      // Simulated server sync. Not Math.random-fragile here: this only ever
      // runs from a user keystroke after hydration, never during render.
      const willFail = Math.random() < 0.08;
      window.setTimeout(() => {
        if (willFail) {
          setSaveState("error");
          retryTimer.current = window.setTimeout(() => persistRef.current(next), 2_500);
          return;
        }
        setSaveState("saved");
      }, 500);
    },
    [storySlug, chapterKey],
  );

  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  function update(next: Partial<ChapterDraftValue>) {
    const merged = { ...value, ...next };
    setValue(merged);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist(merged), AUTOSAVE_DELAY_MS);
  }

  function acceptLocalRecovery() {
    if (!recoverable) return;
    setValue({ title: recoverable.title, content: recoverable.content });
    setRecoverable(null);
  }

  function discardLocalRecovery() {
    clearLocalDraft(storySlug, chapterKey);
    setRecoverable(null);
  }

  function markPublished() {
    clearLocalDraft(storySlug, chapterKey);
  }

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current);
      window.clearTimeout(retryTimer.current);
    },
    [],
  );

  return { value, update, saveState, recoverable, acceptLocalRecovery, discardLocalRecovery, markPublished };
}
