"use client";

import { Moon, Sun } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";

import { cn } from "@/lib/utils";

// Same "has this mounted on the client yet" idiom as the site's own
// components/interactive/theme-switcher.tsx — `useSyncExternalStore` rather
// than `useState`+`useEffect`, so there's no state update to sequence after
// mount at all, just a value that's false during SSR/hydration and true
// immediately after.
function subscribeOnce(onStoreChange: () => void) {
  const id = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(id);
}
function getMountedOnClient() {
  return true;
}
function getMountedOnServer() {
  return false;
}

export type StudioThemeMode = "dark" | "light";

const STORAGE_KEY = "novelnow-studio-theme";

function readStoredMode(): StudioThemeMode {
  if (typeof window === "undefined") return "dark";
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

const StudioThemeContext = createContext<{ mode: StudioThemeMode; toggle: () => void } | null>(null);

/**
 * Studio's own Light/Dark switch — deliberately separate from the site's
 * `next-themes` provider (components/interactive/theme-switcher.tsx). The
 * writer's tools should never inherit whatever the public reader-facing
 * pages happen to be set to, so this keeps its own storage key and its own
 * piece of state instead of reading `useTheme()`.
 *
 * The `data-studio-theme` attribute itself lives on `<html>`, set by
 * studio-theme-script.tsx before paint and updated here imperatively on
 * toggle — never rendered as a React prop. That's what next-themes does for
 * the site's own `.dark` class, and for the same reason: a value React
 * renders during SSR (no localStorage access) and then "corrects" on the
 * client is exactly the shape of a hydration mismatch, and this attribute
 * doesn't need to be a prop anywhere for anything to work — every consumer
 * only needs `mode` for a Sun/Moon icon, not to render the attribute itself.
 */
export function StudioThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<StudioThemeMode>(() => readStoredMode());

  const toggle = useCallback(() => {
    setMode((current) => {
      const next: StudioThemeMode = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Private browsing or a full quota — the in-memory toggle still works for this session.
      }
      document.documentElement.setAttribute("data-studio-theme", next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ mode, toggle }), [mode, toggle]);

  return <StudioThemeContext.Provider value={value}>{children}</StudioThemeContext.Provider>;
}

export function useStudioTheme() {
  const context = useContext(StudioThemeContext);
  if (!context) throw new Error("useStudioTheme must be used within StudioThemeProvider");
  return context;
}

export function StudioThemeToggle({ className }: { className?: string }) {
  const { mode, toggle } = useStudioTheme();
  const mounted = useSyncExternalStore(subscribeOnce, getMountedOnClient, getMountedOnServer);
  // Before mount, render the same "assume dark" default the server did —
  // `readStoredMode()` can only see localStorage on the client — so the
  // very first client render still matches the SSR HTML. The real value
  // (if it's actually "light") takes over on the next tick, same as
  // ThemeSwitcher's own icon does.
  const isDark = mounted ? mode === "dark" : true;
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted hover:text-(--text-primary)",
        className,
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
