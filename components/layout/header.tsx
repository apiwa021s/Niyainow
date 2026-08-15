"use client";

import { BookMarked, ChevronDown, Clock3, LogIn, LogOut, Menu, Search, ShieldCheck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { Logo } from "@/components/layout/logo";
import { NavMegaMenu, type MegaMenuData } from "@/components/layout/nav-mega-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { signOutUser } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const nav = [
  ["หน้าแรก", "/"],
  ["จัดอันดับ", "/rankings"],
  ["อัปเดตล่าสุด", "/updates"],
  ["หมวดหมู่", "/genres"],
] as const;

const novelSubmenu = [
  ["นิยายทั้งหมด", "/novels"],
  ["แนวนิยาย", "/genres"],
  ["แท็ก", "/tags"],
  ["จบแล้ว", "/novels?status=completed"],
] as const;

const accountMenu = [
  ["ชั้นหนังสือ", "/library"],
  ["ประวัติการอ่าน", "/history"],
  ["โปรไฟล์", "/profile"],
  ["ตั้งค่า", "/settings"],
] as const;

export type HeaderViewer = {
  name: string | null;
  email: string | null;
  role: "READER" | "EDITOR" | "ADMIN";
};

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={label} title={label} className="grid h-11 w-11 place-items-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {children}
    </Link>
  );
}

export function Header({ menuData, viewer }: { menuData: MegaMenuData; viewer: HeaderViewer | null | undefined }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [novelsExpanded, setNovelsExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const lastY = useRef(0);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      if (y < 80) setHidden(false);
      else if (y > lastY.current + 6) setHidden(true);
      else if (y < lastY.current - 6) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setAccountOpen(false);
  }

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

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const isStaff = viewer?.role === "ADMIN" || viewer?.role === "EDITOR";

  return (
    <>
    <header className={cn("fixed inset-x-0 top-0 z-50 border-b bg-background/94 backdrop-blur-xl transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]", scrolled ? "border-border shadow-[var(--sh-1)]" : "border-transparent", hidden ? "-translate-y-full" : "translate-y-0")}>
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="เมนูหลัก">
          <NavLink href="/" label="หน้าแรก" pathname={pathname} />
          <NavMegaMenu label="นิยาย" data={menuData} />
          {nav.slice(1).map(([label, href]) => <NavLink key={href} href={href} label={label} pathname={pathname} />)}
        </nav>

        <div className="ml-auto hidden min-w-0 w-[min(300px,24vw)] justify-end md:flex lg:hidden xl:flex"><GlobalSearch mode="inline" /></div>

        <div className="hidden items-center gap-1 md:flex">
          <div className="hidden lg:block xl:hidden"><IconLink href="/search" label="ค้นหา"><Search className="h-5 w-5" /></IconLink></div>
          {viewer === undefined ? (
            <span aria-hidden className="h-11 w-32 animate-pulse rounded-[8px] bg-muted" />
          ) : viewer ? (
            <>
              <IconLink href="/history" label="ประวัติการอ่าน"><Clock3 className="h-5 w-5" /></IconLink>
              <IconLink href="/library" label="ชั้นหนังสือ"><BookMarked className="h-5 w-5" /></IconLink>
            </>
          ) : (
            <Link href="/login" className="flex h-11 items-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-light)]"><LogIn className="h-4 w-4" />เข้าสู่ระบบ</Link>
          )}

          <ThemeSwitcher compact />

          {viewer !== undefined ? <div ref={accountRef} className="relative">
            <button type="button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen} aria-haspopup="menu" aria-label="เมนูบัญชี" className="flex h-11 items-center gap-1 rounded-[8px] px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-card text-foreground"><UserRound className="h-4 w-4" /></span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", accountOpen && "rotate-180")} aria-hidden />
            </button>

            {accountOpen ? (
              <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-[8px] border border-border bg-popover p-2 shadow-[var(--sh-3)]">
                {viewer ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-semibold">{viewer.name || "นักอ่าน NiyaiThai"}</p>
                      <p className="truncate text-xs text-muted-foreground">{viewer.email}</p>
                    </div>
                    <div className="my-1 h-px bg-border" />
                    {accountMenu.map(([label, href]) => <Link key={href} href={href} role="menuitem" className="block rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted">{label}</Link>)}
                    {isStaff ? <Link href="/admin" role="menuitem" className="flex items-center gap-2 rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted"><ShieldCheck className="h-4 w-4" />ระบบจัดการ</Link> : null}
                  </>
                ) : (
                  <Link href="/login" role="menuitem" className="flex items-center gap-2 rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted"><LogIn className="h-4 w-4" />เข้าสู่ระบบด้วย Google</Link>
                )}

                <div className="my-2 h-px bg-border" />
                <div className="px-1 pb-1"><p className="px-2 pb-1.5 text-xs font-semibold text-muted-foreground">โหมดสี</p><ThemeSwitcher /></div>
                {viewer ? (
                  <>
                    <div className="my-2 h-px bg-border" />
                    <form action={signOutUser}>
                      <input type="hidden" name="callbackUrl" value="/" />
                      <button type="submit" role="menuitem" className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"><LogOut className="h-4 w-4" />ออกจากระบบ</button>
                    </form>
                  </>
                ) : null}
              </div>
            ) : null}
          </div> : <span aria-hidden className="h-11 w-11 animate-pulse rounded-[8px] bg-muted" />}
        </div>

        <button type="button" className="ml-auto grid h-11 w-11 place-items-center rounded-[8px] text-muted-foreground hover:bg-muted md:hidden" onClick={() => setOpen(true)} aria-expanded={open} aria-label="เปิดเมนู"><Menu className="h-5 w-5" /></button>
      </div>
    </header>

      {/* อยู่นอก <header> เพราะ header มี transform — ถ้าอยู่ข้างในจะกลายเป็น fixed เทียบกับ header (สูงแค่ 64px) แทน viewport */}
      {open ? (
        <div className="fixed inset-0 z-60 overflow-y-auto bg-background p-4 md:hidden">
          <div className="mb-5 flex items-center justify-between"><Logo /><button type="button" onClick={() => setOpen(false)} aria-label="ปิดเมนู" className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-muted"><X className="h-5 w-5" /></button></div>
          <GlobalSearch mode="mobile" onNavigate={() => setOpen(false)} />

          {viewer === undefined ? (
            <div aria-hidden className="mt-4 h-20 animate-pulse rounded-[8px] bg-muted" />
          ) : viewer ? (
            <div className="mt-4 rounded-[8px] border border-border bg-card p-4">
              <p className="text-xs opacity-80">เข้าสู่ระบบแล้ว</p><p className="truncate font-semibold">{viewer.name || viewer.email}</p>
            </div>
          ) : <Link href="/login" onClick={() => setOpen(false)} className="mt-4 flex items-center justify-center gap-2 rounded-[8px] bg-[var(--brand-primary)] p-4 font-semibold text-white"><LogIn className="h-5 w-5" />เข้าสู่ระบบด้วย Google</Link>}

          <div className="mt-4 grid gap-2">
            <MobileLink href="/" label="หน้าแรก" close={() => setOpen(false)} />
            <div className="overflow-hidden rounded-[8px] border border-border bg-card">
              <button type="button" onClick={() => setNovelsExpanded((value) => !value)} aria-expanded={novelsExpanded} className="flex w-full items-center justify-between px-4 py-3 font-semibold">นิยาย<ChevronDown className={cn("h-4 w-4 transition-transform", novelsExpanded && "rotate-180")} /></button>
              {novelsExpanded ? <ul className="border-t border-border">{novelSubmenu.map(([label, href]) => <li key={href}><Link href={href} onClick={() => setOpen(false)} className="block px-4 py-3 pl-6 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">{label}</Link></li>)}</ul> : null}
            </div>
            {nav.slice(1).map(([label, href]) => <MobileLink key={href} href={href} label={label} close={() => setOpen(false)} />)}
            {viewer ? accountMenu.map(([label, href]) => <MobileLink key={href} href={href} label={label} close={() => setOpen(false)} />) : null}
            {isStaff ? <MobileLink href="/admin" label="ระบบจัดการ" close={() => setOpen(false)} /> : null}
            <Link href="/search" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-[8px] border border-border bg-card px-4 py-3 font-semibold"><Search className="h-4 w-4" />ค้นหาแบบเต็มหน้า</Link>
          </div>

          <div className="mt-5"><p className="mb-2 text-xs font-semibold text-muted-foreground">โหมดสี</p><ThemeSwitcher /></div>
          {viewer ? <form action={signOutUser} className="mt-5"><input type="hidden" name="callbackUrl" value="/" /><button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-[12px] border border-border font-semibold"><LogOut className="h-4 w-4" />ออกจากระบบ</button></form> : null}
        </div>
      ) : null}
    </>
  );
}

function MobileLink({ href, label, close }: { href: string; label: string; close: () => void }) {
  return <Link href={href} onClick={close} className="rounded-[8px] border border-border bg-card px-4 py-3 font-semibold">{label}</Link>;
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string | null }) {
  const active = href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn("relative rounded-md px-3 py-2 text-sm transition-colors", active ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground")}>
      {label}{active ? <span aria-hidden className="absolute inset-x-3 -bottom-[14px] h-0.5 bg-[var(--brand-primary)]" /> : null}
    </Link>
  );
}
