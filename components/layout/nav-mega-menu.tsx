"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { Genre, Novel } from "@/types/novel";

export type MegaMenuData = {
  genres: Genre[];
  promo?: Novel;
};

const exploreLinks = [
  { label: "นิยายทั้งหมด", href: "/novels", description: "เลือกดูและกรองจากคลังทั้งหมด" },
  { label: "อัปเดตล่าสุด", href: "/updates", description: "ตอนใหม่ตามลำดับเวลา" },
  { label: "นิยายจบแล้ว", href: "/novels?status=completed", description: "อ่านต่อเนื่องได้จนจบ" },
  { label: "ค้นจากแท็ก", href: "/tags", description: "เจาะจงธีมและองค์ประกอบ" }
];

export function NavMegaMenu({ label, data }: { label: string; data: MegaMenuData }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = Boolean(
    pathname?.startsWith("/novel") ||
      pathname?.startsWith("/genre") ||
      pathname?.startsWith("/tag") ||
      pathname?.startsWith("/updates")
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <div className={cn("flex items-center rounded-[6px]", open && "bg-muted")}>
        <Link
          href="/novels"
          onClick={() => setOpen(false)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-11 items-center rounded-[6px] px-3 text-sm font-medium transition-colors",
            active ? "text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {label}
          {active ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 bg-[var(--brand-primary)]" /> : null}
        </Link>
        <button
          ref={triggerRef}
          type="button"
          aria-label="เปิดทางเลือกสำหรับสำรวจนิยาย"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="grid h-11 w-11 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronDown aria-hidden className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </button>
      </div>

      {open ? (
        <nav
          id={panelId}
          aria-label="สำรวจนิยาย"
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(560px,calc(100vw-2rem))] rounded-[10px] border border-border bg-popover p-4 shadow-[var(--sh-2)]"
        >
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div>
              <p className="editorial-kicker px-2">EXPLORE</p>
              <ul className="mt-2 grid gap-1">
                {exploreLinks.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-[6px] px-2 py-2.5 transition-colors hover:bg-muted"
                    >
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{item.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
              <div className="flex items-center justify-between gap-3 px-2">
                <p className="editorial-kicker">GENRES</p>
                <Link href="/genres" onClick={() => setOpen(false)} className="text-xs font-semibold text-[var(--brand-light-on-light)] hover:underline">
                  ดูทั้งหมด
                </Link>
              </div>
              <ul className="mt-2 grid grid-cols-2 gap-1">
                {data.genres.slice(0, 8).map((genre) => (
                  <li key={genre.slug}>
                    <Link
                      href={`/genre/${genre.slug}`}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-[6px] px-2 py-2 text-sm hover:bg-muted"
                    >
                      <span className="line-clamp-1">{genre.thaiName}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
