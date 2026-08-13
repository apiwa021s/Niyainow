"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookMarked, ChevronDown, Coins, Menu, Plus, Search, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/layout/logo";
import { NavMegaMenu, type MegaMenuData } from "@/components/layout/nav-mega-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { ThemeSwitcher } from "@/components/interactive/theme-switcher";
import { cn } from "@/lib/utils";
import { useReaderStore } from "@/stores/use-reader-store";

const nav = [
  ["หน้าแรก", "/"],
  ["อัปเดต", "/updates"],
  ["อันดับ", "/rankings"]
];

const novelSubmenu = [
  ["นิยายทั้งหมด", "/novels"],
  ["แนวนิยาย", "/genres"],
  ["แท็ก", "/tags"],
  ["จบแล้ว", "/novels?status=completed"]
];

const accountMenu = [
  ["ชั้นหนังสือ", "/library"],
  ["ประวัติการอ่าน", "/history"],
  ["เหรียญของฉัน", "/wallet"],
  ["ตั้งค่า", "/settings"]
];

/** ปุ่มไอคอนบน header — touch target 44px ตามส่วนที่ 4 ข้อ 8 */
function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      prefetch
      aria-label={label}
      title={label}
      className="grid h-11 w-11 place-items-center rounded-[12px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </Link>
  );
}

export function Header({ menuData }: { menuData: MegaMenuData }) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [novelsExpanded, setNovelsExpanded] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const pathname = usePathname();
  const lastY = useRef(0);
  const accountRef = useRef<HTMLDivElement>(null);

  const coins = useReaderStore((state) => state.coins);
  const isLoggedIn = useReaderStore((state) => state.isLoggedIn);

  /* เลื่อนลง → ซ่อน · เลื่อนขึ้น → โผล่ทันที · อยู่บนสุด → แสดงเต็ม (ส่วนที่ 6.1) */
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

  // ปิดเมนูเมื่อเปลี่ยนหน้า — ปรับ state ตอน render ตามแนวทาง React
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

  // ล็อกการเลื่อนพื้นหลังตอนเปิดเมนูมือถือ
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b bg-background/85 backdrop-blur-xl",
        "transition-[transform,box-shadow,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]",
        scrolled ? "border-border shadow-[var(--sh-1)]" : "border-transparent",
        hidden ? "-translate-y-full" : "translate-y-0"
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="เมนูหลัก">
          <NavLink href="/" label="หน้าแรก" pathname={pathname} />
          <NavMegaMenu label="นิยาย" data={menuData} />
          {nav.slice(1).map(([label, href]) => (
            <NavLink key={href} href={href} label={label} pathname={pathname} />
          ))}
        </nav>

        <div className="ml-auto hidden min-w-0 max-w-md flex-1 justify-end md:flex">
          <GlobalSearch mode="inline" />
        </div>

        <div className="hidden items-center gap-1 md:flex">
          {/* เหรียญ + ปุ่มเติม (ส่วนที่ 6.1) */}
          <Link
            href="/wallet"
            prefetch
            className="flex h-11 items-center gap-1.5 rounded-[12px] px-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={`เหรียญคงเหลือ ${coins} เหรียญ ไปหน้าเติมเหรียญ`}
          >
            <Coins className="h-4 w-4 text-[var(--brand-pink)]" />
            <span className="tabular">{coins.toLocaleString("th-TH")}</span>
            <span aria-hidden className="grid h-5 w-5 place-items-center rounded-full bg-[var(--brand-primary)]/12 text-[var(--brand-primary)]">
              <Plus className="h-3 w-3" />
            </span>
          </Link>

          <IconLink href="/library" label="ชั้นหนังสือ">
            <BookMarked className="h-5 w-5" />
          </IconLink>
          <IconLink href="/notifications" label="การแจ้งเตือน">
            <Bell className="h-5 w-5" />
          </IconLink>

          {/* Avatar menu — สลับธีมอยู่ในนี้ ไม่กินที่ header (ส่วนที่ 6.1) */}
          <div ref={accountRef} className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((value) => !value)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              aria-label="เมนูบัญชี"
              className="flex h-11 items-center gap-1 rounded-[12px] px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[image:var(--grad-primary)] text-white">
                <UserRound className="h-4 w-4" />
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", accountOpen && "rotate-180")} aria-hidden />
            </button>

            {accountOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-56 overflow-hidden rounded-[16px] border border-border bg-popover p-2 shadow-[var(--sh-3)]"
              >
                {accountMenu.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    prefetch
                    role="menuitem"
                    className="block rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    {label}
                  </Link>
                ))}

                <div className="my-2 h-px bg-border" />
                <div className="px-1 pb-1">
                  <p className="px-2 pb-1.5 text-xs font-semibold text-muted-foreground">โหมดสี</p>
                  <ThemeSwitcher />
                </div>
                <div className="my-2 h-px bg-border" />

                <Link
                  href={isLoggedIn ? "/profile" : "/login"}
                  prefetch
                  role="menuitem"
                  className="block rounded-[8px] px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  {isLoggedIn ? "ออกจากระบบ" : "เข้าสู่ระบบ"}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="ml-auto grid h-11 w-11 place-items-center rounded-[12px] text-muted-foreground hover:bg-muted md:hidden"
          onClick={() => setOpen(true)}
          aria-label="เปิดเมนู"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* ---------------- เมนูมือถือ ---------------- */}
      {open ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background p-4 md:hidden">
          <div className="mb-5 flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="ปิดเมนู"
              className="grid h-11 w-11 place-items-center rounded-[12px] hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <GlobalSearch mode="mobile" onNavigate={() => setOpen(false)} />

          <Link
            href="/wallet"
            onClick={() => setOpen(false)}
            className="mt-4 flex items-center justify-between rounded-[16px] bg-[image:var(--grad-primary)] p-4 text-white"
          >
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Coins className="h-5 w-5" />
              เหรียญคงเหลือ
            </span>
            <span className="tabular text-lg font-bold">{coins.toLocaleString("th-TH")}</span>
          </Link>

          <div className="mt-4 grid gap-2">
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="rounded-[12px] border border-border bg-card px-4 py-3 font-semibold"
            >
              หน้าแรก
            </Link>

            <div className="overflow-hidden rounded-[12px] border border-border bg-card">
              <button
                type="button"
                onClick={() => setNovelsExpanded((value) => !value)}
                aria-expanded={novelsExpanded}
                className="flex w-full items-center justify-between px-4 py-3 font-semibold"
              >
                นิยาย
                <ChevronDown className={cn("h-4 w-4 transition-transform", novelsExpanded && "rotate-180")} />
              </button>
              {novelsExpanded ? (
                <ul className="border-t border-border">
                  {novelSubmenu.map(([label, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 pl-6 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {nav.slice(1).map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-[12px] border border-border bg-card px-4 py-3 font-semibold"
              >
                {label}
              </Link>
            ))}

            {accountMenu.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-[12px] border border-border bg-card px-4 py-3 font-semibold"
              >
                {label}
              </Link>
            ))}

            <Link
              href="/search"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-[12px] border border-border bg-card px-4 py-3 font-semibold"
            >
              <Search className="h-4 w-4" /> ค้นหาแบบเต็มหน้า
            </Link>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">โหมดสี</p>
            <ThemeSwitcher />
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** ลิงก์เมนู พร้อมขีดใต้ gradient ตอน active (ส่วนที่ 6.1) */
function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string | null }) {
  const active = href === "/" ? pathname === "/" : Boolean(pathname?.startsWith(href));
  return (
    <Link
      href={href}
      prefetch
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-md px-3 py-2 text-sm transition-colors",
        active ? "font-semibold text-foreground" : "font-medium text-muted-foreground hover:text-foreground"
      )}
    >
      {label}
      {active ? (
        <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[image:var(--grad-primary)]" />
      ) : null}
    </Link>
  );
}
