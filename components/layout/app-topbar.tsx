"use client";

import { Bell, LogIn, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/layout/logo";
import { GlobalSearch } from "@/components/search/global-search";

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
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-(--bg-base)/92 backdrop-blur-md">
      <div className="flex h-(--topbar-h) items-center gap-2 px-3 lg:h-(--topbar-h-lg) lg:px-4">
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
