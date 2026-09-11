"use client";

import { Bell, LogIn, Search, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
export function AppTopbar({
  viewer,
  initialUnreadCount = 0,
}: {
  viewer: TopbarViewer | null | undefined;
  initialUnreadCount?: number;
}) {
  const visible = useScrollChromeVisibility();
  const [searchOpen, setSearchOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  useEffect(() => {
    if (!viewer) return;
    const onCountUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;
      if (typeof detail?.unreadCount === "number") setUnreadCount(Math.max(0, detail.unreadCount));
    };
    const refreshCount = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/me/notifications/unread-count", {
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { data?: { unreadCount?: number } };
        if (typeof payload.data?.unreadCount === "number") setUnreadCount(payload.data.unreadCount);
      } catch {
        // The server-rendered count remains useful while the network is unavailable.
      }
    };
    const interval = window.setInterval(() => void refreshCount(), 60_000);
    window.addEventListener("niyainow:notifications-updated", onCountUpdate);
    document.addEventListener("visibilitychange", refreshCount);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("niyainow:notifications-updated", onCountUpdate);
      document.removeEventListener("visibilitychange", refreshCount);
    };
  }, [viewer]);

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
          aria-label={unreadCount ? `การแจ้งเตือนที่ยังไม่ได้อ่าน ${unreadCount} รายการ` : "การแจ้งเตือน"}
          className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-surface-subtle hover:text-(--text-primary) ${searchOpen ? "hidden lg:grid" : ""}`}
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount ? (
            <span className="absolute right-0.5 top-0.5 grid min-h-4 min-w-4 place-items-center rounded-full bg-[var(--brand-pink)] px-1 text-[10px] font-bold leading-4 text-white ring-2 ring-[var(--bg-base)]">
              {unreadCount > 99 ? "99+" : unreadCount.toLocaleString("th-TH")}
            </span>
          ) : null}
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
