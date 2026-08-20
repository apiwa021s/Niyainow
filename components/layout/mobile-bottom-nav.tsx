"use client";

import { Compass, Home, Library, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ContinueReadingBar } from "@/components/reader/continue-reading-bar";
import { useScrollChromeVisibility } from "@/hooks/use-scroll-chrome-visibility";
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
  const activeIndex = Math.max(0, nav.findIndex((item) => item.match(pathname)));
  const visible = useScrollChromeVisibility();

  return (
    <div className={`sticky bottom-0 z-40 mt-auto transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)] motion-reduce:transition-none lg:translate-y-0 lg:opacity-100 ${visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`}>
      <ContinueReadingBar />
      <nav
        aria-label="เมนูหลักบนมือถือ"
        className="bg-[var(--bg-base)] pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
      >
        <ul className="relative grid h-16 grid-cols-5" style={{ viewTransitionName: "site-bottom-nav" }}>
          <span
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 h-1 w-1/5 rounded-full bg-accent-base transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)]"
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {nav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "tap-target relative flex h-full min-w-0 flex-col items-center justify-center gap-1 px-1 transition-colors",
                    active ? "text-accent-base" : "text-(--text-tertiary) hover:text-(--text-primary)",
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5 shrink-0" strokeWidth={active ? 2.3 : 1.8} />
                  <span className={cn("max-w-full truncate text-[11px] leading-[1.45]", active && "font-semibold")}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
