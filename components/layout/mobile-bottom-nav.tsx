"use client";

import { Compass, Home, Library, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "หน้าแรก", icon: Home, match: (path: string) => path === "/" },
  {
    href: "/novels",
    label: "สำรวจ",
    icon: Compass,
    match: (path: string) => ["/novel", "/genre", "/tag", "/updates", "/rankings"].some((prefix) => path.startsWith(prefix))
  },
  { href: "/search", label: "ค้นหา", icon: Search, match: (path: string) => path.startsWith("/search") },
  { href: "/library", label: "ชั้นหนังสือ", icon: Library, match: (path: string) => path.startsWith("/library") || path.startsWith("/history") }
];

export function MobileBottomNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid h-16 grid-cols-4">
        {nav.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-1 transition-colors",
                  active ? "text-[var(--brand-emphasis)]" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon aria-hidden className="h-5.5 w-5.5" strokeWidth={active ? 2.25 : 1.8} />
                <span className={cn("text-[11px] leading-none", active && "font-semibold")}>{item.label}</span>
                {active ? <span aria-hidden className="absolute inset-x-[30%] top-0 h-0.5 bg-[var(--brand-primary)]" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
