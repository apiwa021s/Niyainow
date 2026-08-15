"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const items = [
  { value: "system", icon: Monitor, label: "ตามระบบ" },
  { value: "light", icon: Sun, label: "สว่าง" },
  { value: "dark", icon: Moon, label: "มืด" }
];

function normalizeTheme(theme?: string) {
  return theme === "light" ? "light" : "dark";
}

function subscribe(onStoreChange: () => void) {
  const id = window.setTimeout(onStoreChange, 0);
  return () => window.clearTimeout(id);
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

export function ThemeSwitcher({ compact = false }: { compact?: boolean }) {
  const { setTheme, resolvedTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const activeTheme = mounted ? normalizeTheme(resolvedTheme) : undefined;
  const selectedTheme = mounted ? (theme ?? "system") : undefined;

  if (compact) {
    const isDark = activeTheme !== "light";
    const Icon = isDark ? Sun : Moon;
    const label = isDark ? "เปลี่ยนเป็นโหมดสว่าง" : "เปลี่ยนเป็นโหมดมืด";
    return (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="grid h-11 w-11 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Icon className="h-4.5 w-4.5" />
      </button>
    );
  }

  return (
    <div role="group" className="inline-flex rounded-[6px] border border-border bg-card p-1" aria-label="เลือกโหมดสี">
      {items.map((item) => {
        const Icon = item.icon;
        const active = selectedTheme === item.value;

        return (
          <Button
            key={item.value}
            aria-label={item.label}
            aria-pressed={active}
            title={item.label}
            size="sm"
            variant={active ? "secondary" : "ghost"}
            onClick={() => setTheme(item.value)}
            className="h-11 px-2.5 text-xs"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
