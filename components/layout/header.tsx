"use client";

import { ChevronDown, LogIn, LogOut, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useId, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { Logo } from "@/components/layout/logo";
import { NavMegaMenu, type MegaMenuData } from "@/components/layout/nav-mega-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { signOutUser } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const accountLinks = [
  ["โปรไฟล์", "/profile"],
  ["ประวัติการอ่าน", "/history"],
  ["ตั้งค่า", "/settings"]
] as const;

const secondaryLinks = [
  ["จัดอันดับ", "/rankings"],
  ["อัปเดตล่าสุด", "/updates"],
  ["แนวนิยาย", "/genres"],
  ["แท็ก", "/tags"],
  ["เกี่ยวกับเรา", "/about"]
] as const;

export type HeaderViewer = {
  name: string | null;
  email: string | null;
  role: "READER" | "EDITOR" | "ADMIN";
};

export function Header({ menuData, viewer }: { menuData: MegaMenuData; viewer: HeaderViewer | null | undefined }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const accountPanelId = useId();
  const mobileDialogId = useId();
  const accountRef = useRef<HTMLDivElement>(null);
  const accountTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileDialogRef = useRef<HTMLDivElement>(null);
  const mobileCloseRef = useRef<HTMLButtonElement>(null);
  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "EDITOR";

  useEffect(() => {
    if (!accountOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setAccountOpen(false);
      accountTriggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => mobileCloseRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        mobileDialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const onResize = () => {
      if (window.innerWidth >= 768) setMobileOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      previouslyFocused?.focus();
    };
  }, [mobileOpen]);

  const closeAccount = () => setAccountOpen(false);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-background">
        <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Logo />

          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="เมนูหลัก">
            <NavLink href="/" label="หน้าแรก" pathname={pathname} />
            <NavMegaMenu label="สำรวจ" data={menuData} />
            <NavLink href="/rankings" label="จัดอันดับ" pathname={pathname} />
            <NavLink href="/library" label="ชั้นหนังสือ" pathname={pathname} />
          </nav>

          <div className="ml-auto hidden w-[clamp(210px,24vw,340px)] min-w-0 md:block">
            <GlobalSearch mode="inline" />
          </div>

          <div
            ref={accountRef}
            className="relative hidden md:block"
            onBlur={(event) => {
              if (!accountRef.current?.contains(event.relatedTarget as Node)) setAccountOpen(false);
            }}
          >
            {viewer === undefined ? (
              <span aria-hidden className="block h-11 w-11 animate-pulse rounded-[6px] bg-muted" />
            ) : (
              <button
                ref={accountTriggerRef}
                type="button"
                aria-label="บัญชีและเมนูเพิ่มเติม"
                aria-expanded={accountOpen}
                aria-controls={accountPanelId}
                onClick={() => setAccountOpen((value) => !value)}
                className="flex h-11 items-center gap-1 rounded-[6px] px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Avatar viewer={viewer} />
                <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", accountOpen && "rotate-180")} />
              </button>
            )}

            {accountOpen && viewer !== undefined ? (
              <div
                id={accountPanelId}
                className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-[10px] border border-border bg-popover p-2 shadow-[var(--sh-2)]"
              >
                {viewer ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">{viewer.name || "นักอ่าน NiyaiThai"}</p>
                      <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    {accountLinks.map(([label, href]) => (
                      <PanelLink key={href} href={href} onClick={closeAccount}>{label}</PanelLink>
                    ))}
                    {isStaff ? (
                      <PanelLink href="/admin" onClick={closeAccount}>
                        <ShieldCheck aria-hidden className="h-4 w-4" />ระบบจัดการ
                      </PanelLink>
                    ) : null}
                  </>
                ) : (
                  <PanelLink href="/login" onClick={closeAccount}>
                    <LogIn aria-hidden className="h-4 w-4" />เข้าสู่ระบบด้วย Google
                  </PanelLink>
                )}

                <div className="my-2 h-px bg-border" />
                <p className="px-3 pb-1 text-xs font-semibold text-muted-foreground">ทางลัด</p>
                <div className="grid grid-cols-2 gap-0.5">
                  {secondaryLinks.map(([label, href]) => (
                    <PanelLink key={href} href={href} onClick={closeAccount}>{label}</PanelLink>
                  ))}
                </div>

                <div className="my-2 h-px bg-border" />
                <div className="px-2 pb-1">
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">โหมดสี</p>
                  <ThemeSwitcher />
                </div>

                {viewer ? (
                  <>
                    <div className="my-2 h-px bg-border" />
                    <form action={signOutUser}>
                      <input type="hidden" name="callbackUrl" value="/" />
                      <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-[6px] px-3 text-left text-sm font-medium hover:bg-muted">
                        <LogOut aria-hidden className="h-4 w-4" />ออกจากระบบ
                      </button>
                    </form>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-1 md:hidden">
            {viewer === undefined ? (
              <span aria-hidden className="h-11 w-11 animate-pulse rounded-[6px] bg-muted" />
            ) : (
              <Link
                href={viewer ? "/profile" : "/login"}
                aria-label={viewer ? "เปิดโปรไฟล์" : "เข้าสู่ระบบ"}
                className="grid h-11 w-11 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Avatar viewer={viewer} />
              </Link>
            )}
            <button
              ref={mobileTriggerRef}
              type="button"
              aria-label="เปิดเมนูเพิ่มเติม"
              aria-expanded={mobileOpen}
              aria-controls={mobileDialogId}
              onClick={() => setMobileOpen(true)}
              className="grid h-11 w-11 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Menu aria-hidden className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div
          ref={mobileDialogRef}
          id={mobileDialogId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${mobileDialogId}-title`}
          className="fixed inset-0 z-[70] overflow-y-auto bg-background px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-3 md:hidden"
        >
          <div className="mx-auto max-w-lg">
            <div className="flex h-14 items-center justify-between border-b border-border">
              <p id={`${mobileDialogId}-title`} className="font-serif text-lg font-semibold">เมนูเพิ่มเติม</p>
              <button ref={mobileCloseRef} type="button" onClick={closeMobile} aria-label="ปิดเมนู" className="grid h-11 w-11 place-items-center rounded-[6px] hover:bg-muted">
                <X aria-hidden className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <GlobalSearch mode="mobile" onNavigate={closeMobile} />
            </div>

            {viewer ? (
              <Link href="/profile" onClick={closeMobile} className="mt-5 flex min-h-16 items-center gap-3 rounded-[10px] border border-border bg-card p-3 hover:bg-muted">
                <Avatar viewer={viewer} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{viewer.name || "นักอ่าน NiyaiThai"}</span>
                  <span className="block truncate text-xs text-muted-foreground">{viewer.email}</span>
                </span>
              </Link>
            ) : (
              <Link href="/login" onClick={closeMobile} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-[var(--brand-primary)] px-4 font-semibold text-white hover:bg-[var(--brand-hover)]">
                <LogIn aria-hidden className="h-5 w-5" />เข้าสู่ระบบด้วย Google
              </Link>
            )}

            <nav aria-label="ทางลัดเพิ่มเติม" className="mt-6">
              <p className="editorial-kicker mb-2">DISCOVER</p>
              <div className="grid gap-1">
                {secondaryLinks.map(([label, href]) => (
                  <MobileLink key={href} href={href} onClick={closeMobile}>{label}</MobileLink>
                ))}
                {viewer ? accountLinks.map(([label, href]) => (
                  <MobileLink key={href} href={href} onClick={closeMobile}>{label}</MobileLink>
                )) : null}
                {isStaff ? <MobileLink href="/admin" onClick={closeMobile}>ระบบจัดการ</MobileLink> : null}
              </div>
            </nav>

            <div className="mt-6 border-t border-border pt-5">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">โหมดสี</p>
              <ThemeSwitcher />
            </div>

            {viewer ? (
              <form action={signOutUser} className="mt-6">
                <input type="hidden" name="callbackUrl" value="/" />
                <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-border font-semibold hover:bg-muted">
                  <LogOut aria-hidden className="h-4 w-4" />ออกจากระบบ
                </button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}

function Avatar({ viewer }: { viewer: HeaderViewer | null }) {
  const initial = viewer?.name?.trim().charAt(0);
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border bg-card text-xs font-semibold text-foreground">
      {initial || <UserRound aria-hidden className="h-4 w-4" />}
    </span>
  );
}

function PanelLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-11 items-center gap-2 rounded-[6px] px-3 text-sm font-medium hover:bg-muted">
      {children}
    </Link>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="flex min-h-12 items-center border-b border-border px-1 text-base font-medium last:border-b-0">
      {children}
    </Link>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string | null }) {
  const active = href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-11 items-center rounded-[6px] px-3 text-sm font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {label}
      {active ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 bg-[var(--brand-primary)]" /> : null}
    </Link>
  );
}
