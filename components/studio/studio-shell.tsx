"use client";

import {
  Bell,
  BookMarked,
  Coins,
  Crown,
  ExternalLink,
  LayoutDashboard,
  Menu,
  MessageSquare,
  PenLine,
  Settings,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { StudioThemeToggle } from "@/components/studio/studio-theme";
import { cn } from "@/lib/utils";

const navGroups = [
  [
    { href: "/studio", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
    { href: "/studio/works", label: "ผลงานของฉัน", icon: BookMarked, exact: false },
    { href: "/studio/fans", label: "แฟนของฉัน", icon: UserRound, exact: false },
    { href: "/studio/posts", label: "โพสต์", icon: MessageSquare, exact: false },
    { href: "/studio/membership", label: "Membership", icon: Crown, exact: false },
    { href: "/studio/earnings", label: "รายได้", icon: Coins, exact: false },
  ],
  [
    { href: "/studio/profile", label: "โปรไฟล์", icon: UserRound, exact: false },
    { href: "/studio/settings", label: "การตั้งค่า", icon: Settings, exact: false },
  ],
  [
    { href: "/", label: "กลับ NovelNow", icon: ExternalLink, exact: false },
  ],
] as const;

function isActive(href: string, pathname: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="เมนูสตูดิโอนักเขียน" className="p-3">
      {navGroups.map((group, index) => (
        <div key={group[0].href}>
          {index > 0 ? <hr className="my-2 border-border" /> : null}
          <div className="grid gap-0.5">
            {group.map((item) => {
              const active = isActive(item.href, pathname, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-(--r-md) px-3 text-sm transition-colors duration-[var(--dur-fast)]",
                    active
                      ? "bg-accent-subtle font-semibold text-[var(--brand-emphasis)]"
                      : "font-medium text-(--text-secondary) hover:bg-muted hover:text-(--text-primary)",
                  )}
                >
                  <Icon aria-hidden className="h-4.5 w-4.5 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

type StudioViewer = { displayName: string; username: string | null; initial: string };

function ProfileCard({ viewer }: { viewer: StudioViewer }) {
  return (
    <div className="m-3 rounded-xl bg-accent-subtle p-3">
      <p className="truncate text-sm font-semibold">{viewer.displayName}</p>
      <p className="truncate text-xs text-(--text-secondary)">
        {viewer.username ? `นักเขียน · @${viewer.username}` : "ตั้งค่าโปรไฟล์นักเขียน"}
      </p>
    </div>
  );
}

const crumbMap: Record<string, string> = {
  "/studio": "ภาพรวม",
  "/studio/works": "ผลงานของฉัน",
  "/studio/fans": "แฟนของฉัน",
  "/studio/posts": "โพสต์",
  "/studio/membership": "Membership",
  "/studio/earnings": "รายได้",
  "/studio/profile": "โปรไฟล์นักเขียน",
  "/studio/settings": "การตั้งค่า",
};

function getBreadcrumb(pathname: string) {
  const direct = crumbMap[pathname];
  if (direct) return `Studio / ${direct}`;
  const hit = Object.entries(crumbMap).find(([path]) => path !== "/studio" && pathname.startsWith(`${path}/`));
  if (hit) return `Studio / ${hit[1]}`;
  return "Studio";
}

/**
 * A chapter editor route hides the dashboard chrome entirely (spec §9/§15) —
 * writing is the only thing on screen. The preview route gets the same
 * treatment: it opens in its own tab specifically to show the chapter the
 * way a reader will see it, and the studio sidebar has no place in that.
 */
function isEditorRoute(pathname: string) {
  return /\/chapters\/(new|[^/]+\/edit|[^/]+\/preview)(\/|$)/.test(pathname);
}

/**
 * Studio chrome. Deliberately not the admin shell: this is a writer-focused
 * surface with its own sub-brand (`data-studio-theme`, see globals.css) and
 * its own Light/Dark switch (components/studio/studio-theme.tsx), so a
 * writer never feels dropped into a back office — or into whatever
 * light/dark mode the reader side happens to be in. Navigation lives in one
 * place and the drawer mirrors it exactly.
 */
export function StudioShell({ children, viewer }: { children: ReactNode; viewer: StudioViewer }) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const editorRoute = isEditorRoute(pathname);
  const breadcrumb = getBreadcrumb(pathname);

  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [drawerOpen]);

  if (editorRoute) {
    // The chapter editor renders its own minimal header (back link + autosave
    // status) — the dashboard sidebar, search, and account chrome would only
    // compete with the writing surface, so none of it mounts on this route.
    return (
      <div className="min-h-dvh bg-(--bg-base) text-(--text-primary)">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-subtle) text-(--text-primary)">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-(--bg-base) lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Logo />
          <span className="text-sm font-semibold">Studio</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        <div className="px-3">
          <Link
            href="/studio/works"
            className="mb-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-(--r-md) bg-[var(--brand-primary)] px-3 text-sm font-semibold text-white shadow-[var(--sh-brand)]"
          >
            <PenLine className="h-4 w-4" />
            เขียนตอนใหม่
          </Link>
        </div>
        <ProfileCard viewer={viewer} />
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เมนูสตูดิโอ"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-(--bg-base) shadow-[var(--sh-3)]"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="ปิดเมนู"
                className="grid h-11 w-11 place-items-center rounded-(--r-md) hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <ProfileCard viewer={viewer} />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-border bg-(--bg-base)/92 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนูสตูดิโอ"
              aria-expanded={drawerOpen}
              className="grid h-11 w-11 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">NovelNow Studio</p>
              <p className="truncate text-xs text-(--text-tertiary)">{breadcrumb}</p>
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <Link
                href="/notifications"
                className="grid h-11 w-11 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted"
                aria-label="การแจ้งเตือน"
              >
                <Bell className="h-4.5 w-4.5" />
              </Link>
              <Link
                href="/studio/works"
                className="hidden h-11 items-center gap-2 rounded-(--r-md) bg-[var(--brand-primary)] px-3 text-sm font-semibold text-white shadow-[var(--sh-brand)] sm:inline-flex"
              >
                <PenLine className="h-4 w-4" />
                เขียนตอนใหม่
              </Link>
              <StudioThemeToggle />
              <span className="inline-flex h-11 items-center gap-2 rounded-(--r-md) px-2 text-sm font-semibold">
                <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-muted/40 text-xs">{viewer.initial}</span>
                <span className="hidden sm:inline">{viewer.displayName}</span>
              </span>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-3 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 lg:pb-8">
          {children}
        </main>
      </div>

      <Link
        href="/studio/works"
        className="fixed inset-x-3 bottom-3 z-30 flex h-12 items-center justify-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-[var(--sh-brand)] sm:hidden"
      >
        <PenLine className="h-4 w-4" />
        เขียนตอนใหม่
      </Link>
    </div>
  );
}
