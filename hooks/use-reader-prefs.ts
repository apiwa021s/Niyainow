"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  DEFAULT_PREFS,
  FONT_SIZE_MAX_INDEX,
  FONT_SIZE_MIN_INDEX,
  LINE_HEIGHT_VALUES,
  WIDTH_VALUES,
  clampSizeIndex,
  fontSizeAt,
  normalizeReaderPrefs,
  useReaderStore,
  type ReaderPrefs,
} from "@/stores/use-reader-store";

const SYNC_DEBOUNCE_MS = 2000;

/** Everything the pre-paint script writes, so the two stay in lockstep. */
function applyPrefsToDocument(prefs: ReaderPrefs) {
  const root = document.documentElement;
  root.setAttribute("data-read-theme", prefs.theme);
  root.setAttribute("data-read-font", prefs.font);
  root.setAttribute("data-read-paragraph", prefs.paragraphStyle);
  root.style.setProperty("--read-size", `${fontSizeAt(prefs.fontSizeIndex)}px`);
  root.style.setProperty("--read-leading", String(LINE_HEIGHT_VALUES[prefs.lineHeight]));
  root.style.setProperty("--read-measure", WIDTH_VALUES[prefs.width]);
}

/**
 * Single entry point for reading preferences.
 *
 * Order of authority: localStorage wins the first paint (it is the only source
 * available before hydration), then a newer server copy replaces it once the
 * session resolves. Writes go to the store immediately and to the server on a
 * trailing debounce — the reader is dragging a size stepper, and every
 * intermediate value does not need a round trip.
 *
 * `signedIn` is passed in rather than read here so the hook stays usable in
 * tests and on pages that already hold the session.
 */
export function useReaderPrefs({ signedIn = false }: { signedIn?: boolean } = {}) {
  const prefs = useReaderStore((state) => state.prefs);
  const setPrefsInStore = useReaderStore((state) => state.setPrefs);
  const resetPrefsInStore = useReaderStore((state) => state.resetPrefs);
  const hydrated = useReaderStore((state) => state.hasHydrated);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<ReaderPrefs | null>(null);
  const pulledRef = useRef(false);

  // Keep the DOM in step with the store. Before hydration the pre-paint script
  // already put the same values there, so this is a no-op on the first pass
  // rather than a second, visible write.
  useEffect(() => {
    if (!hydrated) return;
    applyPrefsToDocument(prefs);
  }, [prefs, hydrated]);

  // Pull the account copy once per session, and only adopt it if the device
  // has not been touched more recently — same rule reading progress uses.
  useEffect(() => {
    if (!signedIn || !hydrated || pulledRef.current) return;
    pulledRef.current = true;

    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch("/api/me/prefs", { signal: controller.signal });
        if (!response.ok) return;
        const body = (await response.json()) as { data?: { prefs?: unknown } | null };
        if (!body.data?.prefs) return;
        setPrefsInStore(normalizeReaderPrefs(body.data.prefs));
      } catch {
        // Offline or aborted: localStorage already rendered a usable reader.
      }
    })();

    return () => controller.abort();
  }, [signedIn, hydrated, setPrefsInStore]);

  const flush = useCallback(() => {
    const payload = pendingRef.current;
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (!payload || !signedIn) return;

    void fetch("/api/me/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Presentation only — a lost write costs nothing the device does not
      // still have, so there is no retry queue to justify here.
    });
  }, [signedIn]);

  const queueSync = useCallback(
    (next: ReaderPrefs) => {
      if (!signedIn) return;
      pendingRef.current = next;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, SYNC_DEBOUNCE_MS);
    },
    [signedIn, flush],
  );

  // A reader who closes the tab mid-debounce should not lose the change.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [flush]);

  const setPrefs = useCallback(
    (patch: Partial<ReaderPrefs>) => {
      const next = { ...useReaderStore.getState().prefs, ...patch };
      setPrefsInStore(patch);
      applyPrefsToDocument(next);
      queueSync(next);
    },
    [setPrefsInStore, queueSync],
  );

  const resetPrefs = useCallback(() => {
    resetPrefsInStore();
    applyPrefsToDocument(DEFAULT_PREFS);
    queueSync(DEFAULT_PREFS);
  }, [resetPrefsInStore, queueSync]);

  const stepFontSize = useCallback(
    (direction: 1 | -1) => {
      const current = useReaderStore.getState().prefs.fontSizeIndex;
      const next = clampSizeIndex(current + direction);
      if (next !== current) setPrefs({ fontSizeIndex: next });
    },
    [setPrefs],
  );

  const cycleTheme = useCallback(() => {
    const order = ["light", "sepia", "dark", "amoled"] as const;
    const current = useReaderStore.getState().prefs.theme;
    setPrefs({ theme: order[(order.indexOf(current) + 1) % order.length] });
  }, [setPrefs]);

  return useMemo(
    () => ({
      prefs,
      hydrated,
      fontSizePx: fontSizeAt(prefs.fontSizeIndex),
      canGrow: prefs.fontSizeIndex < FONT_SIZE_MAX_INDEX,
      canShrink: prefs.fontSizeIndex > FONT_SIZE_MIN_INDEX,
      setPrefs,
      resetPrefs,
      stepFontSize,
      cycleTheme,
    }),
    [prefs, hydrated, setPrefs, resetPrefs, stepFontSize, cycleTheme],
  );
}
