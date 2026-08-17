"use client";

import { Bell, LogIn, Menu, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { MobileNavSheet } from "@/components/layout/mobile-nav-sheet";
import { GlobalSearch } from "@/components/search/global-search";

export type TopbarViewer = {
  name: string | null;
  email: string | null;
  image?: string | null;
  role: "READER" | "EDITOR" | "ADMIN";
};

/**
 * 48px on mobile (brief §6.1): brand, search, notifications — nothing else.
 * Everything that used to live in the mega-menu now lives in the sidebar on
 * desktop and in the sheet on mobile.
 */
export function AppTopbar({ viewer }: { viewer: TopbarViewer | null | undefined }) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-[var(--bg-base)]/92 backdrop-blur-md">
        <div className="flex h-[var(--topbar-h)] items-center gap-2 px-3 lg:h-[var(--topbar-h-lg)] lg:px-4">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="เปิดเมนู"
            aria-expanded={sheetOpen}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary) lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="shrink-0 lg:hidden" aria-label="กลับหน้าแรก">
            <Logo />
          </Link>

          <div className="min-w-0 flex-1">
            <GlobalSearch mode="inline" />
          </div>

          <Link
            href="/notifications"
            aria-label="การแจ้งเตือน"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary)"
          >
            <Bell className="h-[18px] w-[18px]" />
          </Link>

          {viewer === undefined ? (
            <span aria-hidden className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
          ) : viewer ? (
            <Link
              href="/profile"
              aria-label={`บัญชีของ ${viewer.name ?? "คุณ"}`}
              className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-subtle ring-1 ring-border hover:ring-accent-base"
            >
              {viewer.image ? (
                <Image src={viewer.image} alt="" width={36} height={36} className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-[18px] w-[18px] text-(--text-secondary)" />
              )}
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent-base px-3 text-sm font-semibold text-accent-on hover:bg-accent-hover"
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">เข้าสู่ระบบ</span>
            </Link>
          )}
        </div>
      </header>

      <MobileNavSheet open={sheetOpen} onClose={() => setSheetOpen(false)} viewer={viewer ?? null} />
    </>
  );
}
