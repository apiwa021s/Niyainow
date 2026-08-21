"use client";

import {
  BookA,
  BookMarked,
  CalendarDays,
  Coins,
  Columns3,
  ExternalLink,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  Settings,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { Logo } from "@/components/layout/logo";
import { studioProfile } from "@/components/studio/mock-data";
import { StudioSearch } from "@/components/studio/studio-search";
import { StudioThemeToggle } from "@/components/studio/studio-theme";
import { cn } from "@/lib/utils";

/** Grouped by what the writer is doing: making the work, getting paid, learning. */
const navGroups = [
  [
    { href: "/studio", label: "ภาพรวม", icon: LayoutDashboard, exact: true },
    { href: "/studio/works", label: "ผลงานของฉัน", icon: BookMarked, exact: false },
    { href: "/studio/workroom", label: "ห้องแปล", icon: Columns3, exact: false },
    { href: "/studio/schedule", label: "ตารางลง", icon: CalendarDays, exact: false },
    { href: "/studio/readers", label: "ผู้อ่าน", icon: MessagesSquare, exact: false },
    { href: "/studio/glossary", label: "คลังคำ", icon: BookA, exact: false },
    { href: "/studio/team", label: "ทีม", icon: UsersRound, exact: false },
  ],
  [
    { href: "/studio/earnings", label: "รายได้", icon: Coins, exact: false },
    { href: "/studio/payouts", label: "การจ่ายเงิน", icon: Wallet, exact: false },
  ],
  [
    { href: "/studio/academy", label: "Academy", icon: GraduationCap, exact: false },
    { href: "/studio/settings", label: "ตั้งค่านักเขียน", icon: Settings, exact: false },
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

function ProfileCard() {
  return (
    <div className="m-3 rounded-xl bg-accent-subtle p-3">
      <p className="truncate text-sm font-semibold">{studioProfile.penName}</p>
      <p className="truncate text-xs text-(--text-secondary)">
        {studioProfile.role} · {studioProfile.handle}
      </p>
    </div>
  );
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
export function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const editorRoute = isEditorRoute(pathname);

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
          <span className="rounded-[6px] bg-accent-subtle px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand-emphasis)]">
            STUDIO
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavList pathname={pathname} />
        </div>
        <ProfileCard />
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
            <ProfileCard />
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
            <StudioSearch />
            <div className="ml-auto flex shrink-0 items-center gap-1">
              <StudioThemeToggle />
              <Link
                href="/"
                className="inline-flex h-11 items-center gap-1.5 rounded-(--r-md) px-3 text-sm font-medium text-(--text-secondary) hover:bg-muted hover:text-(--text-primary)"
              >
                <ExternalLink aria-hidden className="h-4 w-4" />
                <span className="hidden sm:inline">กลับหน้าเว็บ</span>
              </Link>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl px-3 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-5 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
