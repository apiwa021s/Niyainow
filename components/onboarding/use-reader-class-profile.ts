"use client";

import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import {
  LEGACY_READER_CLASS_STORAGE_KEY,
  READER_CLASS_STORAGE_KEY,
  parseReaderClassProfile,
  type ReaderClassProfile,
} from "@/lib/onboarding/reader-class";

const READER_CLASS_CHANGED_EVENT = "novelnow:reader-class-changed";

function subscribe(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if ([READER_CLASS_STORAGE_KEY, LEGACY_READER_CLASS_STORAGE_KEY].includes(event.key ?? "")) onStoreChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(READER_CLASS_CHANGED_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(READER_CLASS_CHANGED_EVENT, onStoreChange);
  };
}

function getSnapshot() {
  try {
    return window.localStorage.getItem(READER_CLASS_STORAGE_KEY)
      ?? window.localStorage.getItem(LEGACY_READER_CLASS_STORAGE_KEY)
      ?? "";
  } catch {
    return "";
  }
}

function serialize(profile: ReaderClassProfile) {
  return JSON.stringify(profile);
}

export function storeReaderClassProfile(profile: ReaderClassProfile) {
  try {
    window.localStorage.setItem(READER_CLASS_STORAGE_KEY, serialize(profile));
    window.localStorage.removeItem(LEGACY_READER_CLASS_STORAGE_KEY);
    window.dispatchEvent(new Event(READER_CLASS_CHANGED_EVENT));
  } catch {
    // Database persistence remains authoritative when browser storage is unavailable.
  }
}

export function useReaderClassProfile({
  initialProfile,
  canPersist,
}: {
  initialProfile: ReaderClassProfile | null;
  canPersist: boolean;
}) {
  const serverSnapshot = initialProfile ? serialize(initialProfile) : null;
  const rawLocalProfile = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);
  const localProfile = useMemo(
    () => rawLocalProfile === null ? null : parseReaderClassProfile(rawLocalProfile),
    [rawLocalProfile],
  );
  const syncAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      if (getSnapshot() !== serialize(initialProfile)) storeReaderClassProfile(initialProfile);
      return;
    }
    if (!canPersist || !localProfile || syncAttemptRef.current === localProfile.completedAt) return;

    syncAttemptRef.current = localProfile.completedAt;
    const controller = new AbortController();
    void fetch("/api/me/reader-class", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: serialize(localProfile),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json().catch(() => null) as { data?: unknown } | null;
      const stored = parseReaderClassProfile(JSON.stringify(body?.data ?? null));
      if (stored) storeReaderClassProfile(stored);
    }).catch(() => undefined);

    return () => controller.abort();
  }, [canPersist, initialProfile, localProfile]);

  return {
    profile: initialProfile ?? localProfile,
    hydrated: rawLocalProfile !== null,
  };
}
