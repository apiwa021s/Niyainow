"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Star } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Genre, Novel } from "@/types/novel";

export type MegaMenuData = {
  genres: Genre[];
  promo?: Novel;
};

/** คอลัมน์ 1 — วิธีเลือกดู พร้อมคำอธิบายสั้นว่าแต่ละทางพาไปเจออะไร */
const BROWSE_LINKS = [
  { label: "นิยายทั้งหมด", href: "/novels", description: "เลือกดูนิยายแปลทั้งหมด พร้อมตัวกรองครบทุกแบบ" },
  { label: "แนวนิยาย", href: "/genres", description: "ค้นจากแนวที่คุณชอบ ตั้งแต่แฟนตาซีถึงสืบสวน" },
  { label: "แท็ก", href: "/tags", description: "ตามธีมและองค์ประกอบ เช่น เกิดใหม่ ระบบ ดันเจียน" },
  { label: "อัปเดตล่าสุด", href: "/updates", description: "ตอนใหม่ที่เพิ่งลงในไม่กี่ชั่วโมงที่ผ่านมา" }
];

/** คอลัมน์ 2 (ท่อนล่าง) — สถานะการแปล */
const STATUS_LINKS = [
  { label: "กำลังแปล", href: "/novels?status=ongoing" },
  { label: "จบแล้ว", href: "/novels?status=completed" },
  { label: "มาใหม่สัปดาห์นี้", href: "/novels?sort=new" }
];

const OPEN_DELAY = 150;
const CLOSE_DELAY = 120;

/**
 * Mega menu ของเมนู "นิยาย" (ส่วนที่ 6.1)
 * • เปิดตอน hover พร้อม delay 150ms กันเมนูเด้งตอนเมาส์ผ่าน
 * • คลิก/Enter/Space เปิดได้ด้วย เพื่อให้ใช้คีย์บอร์ดและจอสัมผัสได้ (ส่วนที่ 8)
 * • Esc ปิดแล้วโฟกัสกลับที่ปุ่ม
 */
export function NavMegaMenu({ label, data }: { label: string; data: MegaMenuData }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<number | undefined>(undefined);
  const pathname = usePathname();

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  };

  const scheduleOpen = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(true), OPEN_DELAY);
  };

  const scheduleClose = () => {
    clearTimer();
    timerRef.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  useEffect(() => clearTimer, []);

  // ปิดเมนูเมื่อเปลี่ยนหน้า — ปรับ state ตอน render ตามแนวทางของ React
  // (ใช้ useEffect + setState จะทำให้เกิด cascading render)
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  // Esc ปิด + คลิกนอกปิด
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  const active = pathname?.startsWith("/novel") || pathname?.startsWith("/genre") || pathname?.startsWith("/tag");

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      // โฟกัสหลุดออกจากกลุ่มทั้งหมด  ปิด (รองรับการ Tab ออก)
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={panelId}
        onClick={() => {
          clearTimer();
          setOpen((value) => !value);
        }}
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
          active || open ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform duration-[var(--dur-fast)]", open && "rotate-180")}
          aria-hidden
        />
        {/* ขีดใต้ gradient ยาวเท่าข้อความเมื่อ active (ส่วนที่ 6.1) */}
        {active ? <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-[image:var(--grad-primary)]" /> : null}
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-[min(880px,calc(100vw-2rem))] overflow-hidden rounded-[16px] border border-border bg-popover shadow-[var(--sh-3)]"
        >
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)_200px]">
            {/* คอลัมน์ 1 — วิธีเลือกดู */}
            <ul className="flex flex-col">
              {BROWSE_LINKS.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    className="block rounded-[12px] border-l-2 border-transparent px-3 py-2.5 transition-colors hover:border-[var(--brand-primary)] hover:bg-muted"
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {/* คอลัมน์ 2 — แนวยอดนิยม + สถานะ */}
            <div className="min-w-0">
              <p className="px-1 text-xs font-semibold tracking-wide text-muted-foreground">แนวยอดนิยม</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
                {data.genres.slice(0, 12).map((genre) => (
                  <li key={genre.slug}>
                    <Link
                      href={`/genre/${genre.slug}`}
                      prefetch
                      className="flex items-baseline justify-between gap-2 rounded-[8px] px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                    >
                      <span className="truncate">{genre.thaiName}</span>
                      <span className="tabular shrink-0 text-[11px] text-muted-foreground">
                        {genre.count.toLocaleString("th-TH")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              <p className="mt-4 px-1 text-xs font-semibold tracking-wide text-muted-foreground">สถานะ</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {STATUS_LINKS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      prefetch
                      className="block rounded-[8px] bg-muted px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-[var(--brand-primary)]/12"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* คอลัมน์ 3 — การ์ดโปรโมท 1 เรื่อง */}
            {data.promo ? (
              <div className="hidden lg:block">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">กำลังมาแรง</p>
                <Link href={`/novel/${data.promo.slug}`} prefetch className="group block">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] bg-muted shadow-[var(--sh-1)]">
                    <Image
                      src={data.promo.cover}
                      alt={`ปกนิยาย ${data.promo.thaiTitle}`}
                      fill
                      sizes="200px"
                      className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{data.promo.thaiTitle}</p>
                  <p className="tabular mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Star className="h-3 w-3 fill-[var(--brand-pink)] text-[var(--brand-pink)]" />
                    {data.promo.rating} · {data.promo.chapters} ตอน
                  </p>
                  <span className="mt-2 block rounded-[8px] bg-[image:var(--grad-primary)] px-3 py-2 text-center text-xs font-semibold text-white">
                    เริ่มอ่าน
                  </span>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
