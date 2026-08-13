"use client";

import Link from "next/link";
import { Home, Library, Search, UserRound, WandSparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/search", label: "ค้นหา", icon: Search },
  { href: "/updates", label: "อัปเดต", icon: WandSparkles },
  { href: "/library", label: "คลัง", icon: Library },
  { href: "/profile", label: "โปรไฟล์", icon: UserRound }
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/90 px-2 py-2 backdrop-blur md:hidden" aria-label="เมนูมือถือ">
      <div className="grid grid-cols-5 gap-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={cn("flex h-12 flex-col items-center justify-center rounded-md text-[11px] text-muted-foreground", active && "bg-secondary text-foreground")}>
              <Icon className="mb-0.5 h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
