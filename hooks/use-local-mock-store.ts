"use client";

import { useSyncExternalStore } from "react";

type Listener = () => void;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call after writing to a local mock store (localStorage) so subscribers re-render. */
export function notifyLocalMockStores() {
  for (const listener of listeners) listener();
}

/**
 * Reads a browser-only mock store (localStorage-backed follow/membership/
 * privacy state) safely across SSR + hydration via useSyncExternalStore,
 * instead of the "useState + useEffect(() => setState(read()))" pattern that
 * `react-hooks/set-state-in-effect` flags. Re-renders whenever
 * `notifyLocalMockStores()` is called after a write.
 */
export function useLocalMockStore<T>(getSnapshot: () => T, getServerSnapshot: () => T): T {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
