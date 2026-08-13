"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

// ธีมของเว็บมีแค่ light/dark — ธีมหน้าอ่าน (5 ธีม) อยู่ในแผงตั้งค่าของ Reader
const items = [
  { value: "dark", icon: Moon, label: "มืด" },
  { value: "light", icon: Sun, label: "สว่าง" }
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

export function ThemeSwitcher() {
  const { setTheme, resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  // defaultTheme="system" → ต้องอ่าน resolvedTheme ไม่ใช่ theme (ซึ่งจะเป็น "system")
  const activeTheme = mounted ? normalizeTheme(resolvedTheme) : undefined;

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
