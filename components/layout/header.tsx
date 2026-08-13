"use client";

import Link from "next/link";
import { Bell, BookMarked, Menu, Search, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Logo } from "@/components/layout/logo";
import { GlobalSearch } from "@/components/search/global-search";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const nav = [
  ["หน้าแรก", "/"],
  ["นิยาย", "/novels"],
  ["อัปเดต", "/updates"],
  ["อันดับ", "/rankings"],
  ["หมวดหมู่", "/genres"]
];

export function Header() {
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 border-b border-border bg-background/82 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl transition-all", compact ? "py-2" : "py-4")}>
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="hidden items-center gap-1 lg:flex" aria-label="เมนูหลัก">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-white/10 hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden min-w-0 flex-1 justify-end md:flex">
          <GlobalSearch mode="inline" />
        </div>
        <div className="hidden items-center gap-1 md:flex">
          <ThemeSwitcher />
          <Link href="/library" className="grid h-10 w-10 place-items-center rounded-md border border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/10 hover:text-foreground" aria-label="คลัง">
            <BookMarked className="h-5 w-5" />
          </Link>
          <Link href="/notifications" className="grid h-10 w-10 place-items-center rounded-md border border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/10 hover:text-foreground" aria-label="แจ้งเตือน">
            <Bell className="h-5 w-5" />
          </Link>
          <Link href="/profile" className="grid h-10 w-10 place-items-center rounded-md border border-transparent text-muted-foreground hover:border-white/10 hover:bg-white/10 hover:text-foreground" aria-label="โปรไฟล์">
            <UserRound className="h-5 w-5" />
          </Link>
        </div>
        <Button className="ml-auto md:hidden" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="เปิดเมนู">
          <Menu className="h-5 w-5" />
        </Button>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 bg-background/96 p-4 backdrop-blur md:hidden">
          <div className="mb-5 flex items-center justify-between">
            <Logo />
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="ปิดเมนู">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <GlobalSearch mode="mobile" onNavigate={() => setOpen(false)} />
          <div className="mt-4">
            <ThemeSwitcher />
          </div>
          <div className="mt-6 grid gap-2">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-md border border-border bg-card px-4 py-3 font-semibold">
                {label}
              </Link>
            ))}
            <Link href="/search" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 font-semibold">
              <Search className="h-4 w-4" /> ค้นหาแบบเต็มหน้า
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
