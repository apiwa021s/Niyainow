"use client";

import { Compass, Home, Library, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ContinueReadingBar } from "@/components/reader/continue-reading-bar";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "หน้าแรก", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/novels",
    label: "หมวดหมู่",
    icon: Compass,
    match: (path: string) =>
      ["/novels", "/novel", "/genre", "/tag", "/updates", "/rankings"].some((prefix) => path.startsWith(prefix)),
  },
  { href: "/search", label: "ค้นหา", icon: Search, match: (path: string) => path.startsWith("/search") },
  {
    href: "/library",
    label: "ชั้นหนังสือ",
    icon: Library,
    match: (path: string) => path.startsWith("/library") || path.startsWith("/history"),
  },
  {
    href: "/profile",
    label: "ฉัน",
    icon: UserRound,
    match: (path: string) => ["/profile", "/settings", "/notifications", "/wallet"].some((p) => path.startsWith(p)),
  },
];

/** Five slots (brief §6.1), with the floating resume bar riding above it. */
export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <div className="sticky bottom-0 z-40 mt-auto lg:hidden">
      <ContinueReadingBar />
      <nav
        aria-label="เมนูหลักบนมือถือ"
        className="bg-[var(--bg-base)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
      >
        <ul className="grid h-16 grid-cols-5">
          {nav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors",
                    active ? "text-accent-base" : "text-(--text-tertiary) hover:text-(--text-primary)",
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5 shrink-0" strokeWidth={active ? 2.3 : 1.8} />
                  <span className={cn("max-w-full truncate text-[11px] leading-none", active && "font-semibold")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
