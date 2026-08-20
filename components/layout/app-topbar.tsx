"use client";

import { Bell, LogIn, Search, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Logo } from "@/components/layout/logo";
import { GlobalSearch } from "@/components/search/global-search";
import { useScrollChromeVisibility } from "@/hooks/use-scroll-chrome-visibility";

export type TopbarViewer = {
  name: string | null;
  email: string | null;
  image?: string | null;
  role: "READER" | "EDITOR" | "ADMIN";
};

/**
 * Mobile: 48px, and only what brief §6.1 allows — brand, search, notifications.
 * Navigation lives in the bottom nav, the account lives behind its "ฉัน" tab,
 * and secondary destinations live in the footer, so no hamburger and no avatar
 * compete with the search field for the 360px viewport.
 *
 * Desktop: the sidebar owns navigation, so the avatar appears here instead.
 */
export function AppTopbar({ viewer }: { viewer: TopbarViewer | null | undefined }) {
  const visible = useScrollChromeVisibility();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className={`sticky top-0 z-40 bg-(--bg-base)/92 backdrop-blur-md transition-[transform,opacity] duration-[180ms] ease-[var(--ease-out)] motion-reduce:transition-none lg:translate-y-0 lg:opacity-100 ${visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"}`}
      style={{ viewTransitionName: "site-header" }}
    >
      <div className="flex h-(--topbar-h) items-center gap-2 px-3 lg:h-(--topbar-h-lg) lg:px-4">
        <Logo className={`shrink-0 lg:hidden ${searchOpen ? "hidden" : ""}`} />

        {/* Desktop keeps the field open; mobile trades it for the brand until asked. */}
        <div className={`min-w-0 flex-1 ${searchOpen ? "" : "hidden lg:block"}`}>
          <GlobalSearch
            mode="inline"
            autoFocus={searchOpen}
            onDismiss={() => setSearchOpen(false)}
            onNavigate={() => setSearchOpen(false)}
          />
        </div>

        {searchOpen ? (
          <button
            type="button"
            onClick={() => setSearchOpen(false)}
            aria-label="ปิดช่องค้นหา"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary) lg:hidden"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="ค้นหา"
            aria-expanded={false}
            className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary) lg:hidden"
          >
            <Search className="h-4.5 w-4.5" />
          </button>
        )}

        <Link
          href="/notifications"
          aria-label="การแจ้งเตือน"
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary) ${searchOpen ? "hidden lg:grid" : ""}`}
        >
          <Bell className="h-4.5 w-4.5" />
        </Link>

        {viewer === undefined ? (
          <span aria-hidden className="hidden h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted lg:block" />
        ) : viewer ? (
          <Link
            href="/profile"
            aria-label={`บัญชีของ ${viewer.name ?? "คุณ"}`}
            className="hidden h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-surface-subtle ring-1 ring-border hover:ring-accent-base lg:grid"
          >
            {viewer.image ? (
              <Image src={viewer.image} alt="" width={36} height={36} className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-4.5 w-4.5 text-(--text-secondary)" />
            )}
          </Link>
        ) : (
          <Link
            href="/login"
            className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full bg-accent-base px-3 text-sm font-semibold text-accent-on hover:bg-accent-hover lg:inline-flex"
          >
            <LogIn className="h-4 w-4" />
            เข้าสู่ระบบ
          </Link>
        )}
      </div>
    </header>
  );
}
