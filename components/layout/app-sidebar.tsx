"use client";
import {
  BookOpen,
  Clock3,
  Compass,
  Home,
  Info,
  Library,
  PanelLeft,
  Sparkles,
  Tags,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentType } from "react";
import { BrandMark, BrandWordmark } from "@/components/brand/brand-mark";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Prefixes that should light this row up, beyond an exact href match. */
  owns?: string[];
};

const primaryNav: NavItem[] = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/novels", label: "สำรวจนิยาย", icon: Compass, owns: ["/novel"] },
  { href: "/genres", label: "แนวนิยาย", icon: BookOpen, owns: ["/genre"] },
  { href: "/rankings", label: "จัดอันดับ", icon: Trophy },
  { href: "/updates", label: "อัปเดตล่าสุด", icon: Sparkles },
  { href: "/tags", label: "แท็ก", icon: Tags, owns: ["/tag"] },
];

const libraryNav: NavItem[] = [
  { href: "/library", label: "ชั้นหนังสือ", icon: Library },
  { href: "/history", label: "ประวัติการอ่าน", icon: Clock3 },
];

const supportNav: NavItem[] = [{ href: "/about", label: "ศูนย์ข้อมูล", icon: Info }];

const STORAGE_KEY = "niyainow-sidebar-expanded";

/**
 * The collapsed/expanded choice lives in localStorage, so it is external state,
 * not React state. Reading it through useSyncExternalStore keeps the server
 * render deterministic (always expanded) and lets the client correct itself on
 * hydration without a cascading effect.
 */

const sidebarStore = {
  listeners: new Set<() => void>(),
  subscribe(listener: () => void) {
    sidebarStore.listeners.add(listener);
    return () => {
      sidebarStore.listeners.delete(listener);
    };
  },
  getSnapshot() {
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "false";
    } catch {
      // Private-mode browsers deny storage; the default width is fine.
      return true;
    }
  },
  getServerSnapshot() {
    return true;
  },
  toggle() {
    const next = !sidebarStore.getSnapshot();
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // Ignore: the preference is a convenience, not state we depend on.
    }
    for (const listener of sidebarStore.listeners) listener();
  },
};

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.owns ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Desktop rail, 64px collapsed / 240px expanded (brief §6.1). It replaces the
 * mega-menu: a persistent rail costs one icon column but removes a hover layer,
 * and it keeps every destination one click away while reading a grid.
 */

export function AppSidebar() {
  const pathname = usePathname() ?? "/";
  const expanded = useSyncExternalStore(
    sidebarStore.subscribe,
    sidebarStore.getSnapshot,
    sidebarStore.getServerSnapshot,
  );
  const renderGroup = (items: NavItem[], label?: string) => (
    <div className="flex flex-col gap-0.5">
      {label && expanded ? (
        <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-widest text-(--text-tertiary)">
          {label}
        </p>
      ) : null}
      {items.map((item) => {
        const active = isActive(pathname, item);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            title={expanded ? undefined : item.label}
            className={cn(
              "relative flex min-h-11 items-center gap-3 rounded-(--r-md) px-3 text-sm font-medium transition-colors",
              expanded ? "justify-start" : "justify-center px-0",
              active
                ? "bg-accent-subtle text-accent-base"
                : "text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary)",
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-accent-base"
              />
            ) : null}
            <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
            {expanded ? <span className="truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
          </Link>
        );
      })}
    </div>
  );
  return (
    <aside
      aria-label="เมนูหลัก"
      className={cn(
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-border bg-surface p-2 transition-[width] duration-(--dur-base) ease-(--ease-out) lg:flex",
        expanded ? "w-(--sidebar-expanded)" : "w-(--sidebar-collapsed)",
      )}
    >
      <div className={cn("flex min-h-12 items-center gap-2 border-b border-border pb-2", expanded ? "justify-between px-1" : "justify-center")}>
        <Link
          href="/"
          aria-label="NiyaiThai หน้าแรก"
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-(--r-md) text-sm font-semibold",
            expanded ? "px-2" : "justify-center",
          )}
        >
          <BrandMark className="h-8 w-8 shrink-0" />
          {expanded ? <BrandWordmark className="truncate" /> : <span className="sr-only">NiyaiThai</span>}
        </Link>
        <button
          type="button"
          onClick={sidebarStore.toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "ย่อเมนู" : "ขยายเมนู"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary)"
        >
          <PanelLeft className="h-4.5 w-4.5" />
        </button>
      </div>
      <nav className="pane-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-1 pr-1">
        {renderGroup(primaryNav)}
        <div aria-hidden className="my-1 h-px bg-border" />
        {renderGroup(libraryNav, "ของฉัน")}
        <div aria-hidden className="my-1 h-px bg-border" />
        {renderGroup(supportNav)}
      </nav>
      <div className={cn("border-t border-border pt-2", expanded ? "px-1" : "grid place-items-center")}>
        <ThemeSwitcher compact={!expanded} />
      </div>
    </aside>
  );
}
