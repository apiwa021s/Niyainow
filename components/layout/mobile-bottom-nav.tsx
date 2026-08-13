"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookMarked, Home, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReaderStore } from "@/stores/use-reader-store";

/**
 * Bottom tab bar (ส่วนที่ 6.2)
 * สูง 56px + safe-area, พื้นหลัง blur, เส้นบน 1px
 * ไอคอน 24px + label 10px, active = สีแบรนด์ + label หนา 600
 */
const nav = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/search", label: "ค้นหา", icon: Search },
  { href: "/library", label: "ชั้นหนังสือ", icon: BookMarked },
  { href: "/updates", label: "อัปเดต", icon: Bell, badge: true },
  { href: "/profile", label: "ฉัน", icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const follows = useReaderStore((state) => state.follows);

  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid h-14 grid-cols-5">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(item.href));
          const Icon = item.icon;
          // จุดชมพูบน "อัปเดต" เมื่อมีเรื่องที่ติดตาม (ส่วนที่ 6.2)
          const showBadge = item.badge && follows.length > 0;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-[var(--brand-primary)]" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
                  {showBadge ? (
                    <span
                      aria-hidden
                      className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-[var(--brand-pink)] ring-2 ring-background"
                    />
                  ) : null}
                </span>
                <span className={cn("text-[10px] leading-none", active && "font-semibold")}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
