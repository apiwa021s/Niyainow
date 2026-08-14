"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ExternalLink, LogOut, Menu, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { adminNavGroups, isNavItemActive, type AdminNavItem } from "@/components/admin/admin-nav";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { Logo } from "@/components/layout/logo";
import { cn } from "@/lib/utils";

export type PendingCounts = {
  submissions: number;
  reports: number;
  comments: number;
  payouts: number;
};

/**
 * โครงหน้าหลังบ้าน
 * เดสก์ท็อป: เมนูซ้ายค้างไว้ตลอด (แอดมินสลับหน้าถี่ ต้องเห็นทุกเมนูตลอดเวลา)
 * มือถือ: เมนูเป็นลิ้นชักเลื่อนออกมา ปิดเองเมื่อเปลี่ยนหน้า
 */
export function AdminShell({ children, pending }: { children: ReactNode; pending: PendingCounts }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  // ปิดเมนูเมื่อเปลี่ยนหน้า — ปรับ state ตอน render ตามแนวทาง React
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setDrawerOpen(false);
    setAccountOpen(false);
  }

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  const alerts = pending.reports + pending.submissions;

  return (
    <div className="min-h-screen bg-[var(--bg-subtle)]">
      {/* ---------------- เมนูซ้าย (เดสก์ท็อป) ---------------- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-66 flex-col border-r border-border bg-background lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <Logo />
          <span className="rounded-[6px] bg-[var(--brand-primary)]/12 px-1.5 py-0.5 text-[10px] font-bold text-[var(--brand-light-on-light)]">
            ADMIN
          </span>
        </div>
        <NavList pathname={pathname} pending={pending} className="flex-1 overflow-y-auto px-3 py-4" />
        <SidebarFooter />
      </aside>

      {/* ---------------- ลิ้นชักเมนู (มือถือ) ---------------- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="เมนูหลังบ้าน"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-background shadow-[var(--sh-3)]"
          >
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Logo />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="ปิดเมนู"
                className="grid h-11 w-11 place-items-center rounded-[12px] hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavList pathname={pathname} pending={pending} className="flex-1 overflow-y-auto px-3 py-4" />
            <SidebarFooter />
          </div>
        </div>
      ) : null}

      {/* ---------------- แถบบน + เนื้อหา ---------------- */}
      <div className="lg:pl-66">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="เปิดเมนู"
              className="grid h-11 w-11 place-items-center rounded-[12px] text-muted-foreground hover:bg-muted lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <form
              role="search"
              className="relative hidden min-w-0 max-w-sm flex-1 md:block"
              onSubmit={(event) => event.preventDefault()}
            >
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="ค้นหานิยาย ผู้ใช้ หรือรหัสธุรกรรม…"
                aria-label="ค้นหาในระบบหลังบ้าน"
                className="h-10 w-full rounded-[12px] border border-border bg-card pl-9 pr-3 text-sm placeholder:text-[var(--text-tertiary)] focus:border-[var(--brand-primary)]"
              />
            </form>

            <div className="ml-auto flex items-center gap-1">
              <Link
                href="/"
                prefetch
                className="hidden h-10 items-center gap-1.5 rounded-[12px] px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground sm:flex"
              >
                <ExternalLink className="h-4 w-4" />
                ดูเว็บไซต์
              </Link>

              <Link
                href="/admin/reports"
                prefetch
                aria-label={`งานที่รอดำเนินการ ${alerts} รายการ`}
                className="relative grid h-11 w-11 place-items-center rounded-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Bell className="h-5 w-5" />
                {alerts > 0 ? (
                  <span className="tabular absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {alerts}
                  </span>
                ) : null}
              </Link>

              <div ref={accountRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((value) => !value)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="flex h-11 items-center gap-2 rounded-[12px] px-2 text-left hover:bg-muted"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[image:var(--grad-primary)] text-white">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <span className="hidden min-w-0 sm:block">
                    <span className="block truncate text-sm font-semibold">ณัฐฐา ทองแท้</span>
                    <span className="block text-[11px] text-muted-foreground">ผู้ดูแลระบบ</span>
                  </span>
                </button>

                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-[16px] border border-border bg-popover p-2 shadow-[var(--sh-3)]"
                  >
                    <Link href="/admin/staff" role="menuitem" className="block rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted">
                      ทีมงานและสิทธิ์
                    </Link>
                    <Link
                      href="/admin/settings"
                      role="menuitem"
                      className="block rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted"
                    >
                      ตั้งค่าเว็บไซต์
                    </Link>

                    <div className="my-2 h-px bg-border" />
                    <div className="px-1 pb-1">
                      <p className="px-2 pb-1.5 text-xs font-semibold text-muted-foreground">โหมดสี</p>
                      <ThemeSwitcher />
                    </div>
                    <div className="my-2 h-px bg-border" />

                    <Link
                      href="/admin/login"
                      role="menuitem"
                      className="flex items-center gap-2 rounded-[8px] px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      ออกจากระบบ
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavList({
  pathname,
  pending,
  className
}: {
  pathname: string | null;
  pending: PendingCounts;
  className?: string;
}) {
  return (
    <nav className={className} aria-label="เมนูหลังบ้าน">
      {adminNavGroups.map((group) => (
        <div key={group.title} className="mb-4 last:mb-0">
          <p className="px-3 pb-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">{group.title}</p>
          <ul className="grid gap-0.5">
            {group.items.map((item) => (
              <li key={item.href}>
                <NavLink item={item} active={isNavItemActive(item, pathname)} count={item.badge ? pending[item.badge] : 0} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function NavLink({ item, active, count }: { item: AdminNavItem; active: boolean; count: number }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-2.5 rounded-[10px] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[var(--brand-primary)]/12 font-semibold text-[var(--brand-light-on-light)]"
          : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {count > 0 ? (
        <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-destructive px-1.5 text-[11px] font-bold text-white">
          {count.toLocaleString("th-TH")}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarFooter() {
  return (
    <div className="border-t border-border p-3">
      <div className="flex items-start gap-2.5 rounded-[12px] bg-muted px-3 py-2.5">
        <ShieldCheck aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          ระบบสาธิต — ข้อมูลทั้งหมดเป็นข้อมูลตัวอย่าง คำสั่งต่าง ๆ ยังไม่บันทึกลงฐานข้อมูลจริง
        </p>
      </div>
    </div>
  );
}
