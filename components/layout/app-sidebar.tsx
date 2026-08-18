"use client";
import {
  BookOpen,
  Clock3,
  Coins,
  Compass,
  Home,
  Info,
  Library,
  Sparkles,
  Tags,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
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
  { href: "/wallet", label: "กระเป๋าเหรียญ", icon: Coins },
];

const supportNav: NavItem[] = [{ href: "/about", label: "ศูนย์ข้อมูล", icon: Info }];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/") return pathname === "/";
  if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true;
  return (item.owns ?? []).some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

/**
 * Persistent desktop navigation. It replaces the
 * mega-menu: a persistent rail costs one icon column but removes a hover layer,
 * and it keeps every destination one click away while reading a grid.
 */

export function AppSidebar() {
  const pathname = usePathname() ?? "/";
  const renderGroup = (items: NavItem[], label?: string) => (
    <div className="flex flex-col gap-0.5">
      {label ? (
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
            className={cn(
              "relative flex min-h-11 items-center justify-start gap-3 rounded-(--r-md) px-3 text-sm font-medium transition-colors",
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
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
  return (
    <aside
      aria-label="เมนูหลัก"
      className="sticky top-0 hidden h-dvh w-(--sidebar-expanded) shrink-0 flex-col gap-1 bg-surface p-2 lg:flex"
    >
      <div className="flex min-h-12 items-center gap-2 px-1 pb-2">
        <Link
          href="/"
          aria-label="NovelNow หน้าแรก"
          className="flex min-w-0 items-center gap-2 rounded-(--r-md) px-2 text-sm font-semibold"
        >
          <BrandMark className="h-7 w-auto shrink-0" />
          <BrandWordmark className="truncate" />
        </Link>
      </div>
      <nav className="pane-scroll -mr-1 flex min-h-0 flex-1 flex-col gap-2 pr-1">
        {renderGroup(primaryNav)}
        {renderGroup(libraryNav, "ของฉัน")}
        {renderGroup(supportNav)}
      </nav>
      <div className="px-1 pt-3">
        <ThemeSwitcher compact={false} />
      </div>
    </aside>
  );
}
