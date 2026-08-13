"use client";

import { Eye, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const items = [
  { value: "dark", icon: Moon, label: "มืด" },
  { value: "light", icon: Sun, label: "สว่าง" },
  { value: "sepia", icon: Eye, label: "ถนอมสายตา" }
];

function normalizeTheme(theme?: string) {
  if (theme === "light" || theme === "sepia") return theme;
  return "dark";
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

export function ThemeSwitcher() {
  const { setTheme, theme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const activeTheme = mounted ? normalizeTheme(theme) : undefined;

  return (
    <div className="inline-flex rounded-md border border-border bg-card p-1" aria-label="เลือกโหมดสี">
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeTheme === item.value;

        return (
          <Button
            key={item.value}
            aria-label={item.label}
            aria-pressed={active}
            title={item.label}
            size="sm"
            variant={active ? "secondary" : "ghost"}
            onClick={() => setTheme(item.value)}
            className="h-8 px-2 text-xs"
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{item.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
