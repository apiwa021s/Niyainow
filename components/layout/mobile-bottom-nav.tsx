"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookMarked, Clock3, Home, Search, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bottom tab bar (ส่วนที่ 6.2)
 * สูง 56px + safe-area, พื้นหลัง blur, เส้นบน 1px
 * ไอคอน 24px + label 10px, active = สีแบรนด์ + label หนา 600
 */
const nav = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/search", label: "ค้นหา", icon: Search },
  { href: "/library", label: "ชั้นหนังสือ", icon: BookMarked },
  { href: "/history", label: "ประวัติ", icon: Clock3 },
  { href: "/profile", label: "บัญชี", icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/96 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="grid h-14 grid-cols-5">
        {nav.map((item) => {
          const active = item.href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(item.href));
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full flex-col items-center justify-center gap-0.5 transition-colors",
                  active ? "text-[var(--brand-primary)]" : "text-muted-foreground"
                )}
              >
                <span className="relative">
                  <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 1.8} />
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
