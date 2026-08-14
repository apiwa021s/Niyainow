"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Content row มาตรฐาน (ส่วนที่ 6.3) — ใช้ซ้ำทุก section
 * • หัวข้อ H2 + คำอธิบาย 1 บรรทัด + "ดูทั้งหมด " ชิดขวา
 * • scroll-snap-type: x mandatory
 * • การ์ดถัดไปโผล่ ~20% เป็นสัญญาณว่าเลื่อนได้ (ได้จาก padding ขวาของ track)
 * • desktop มีลูกศรซ้าย/ขวา ซ่อนเมื่อสุดทาง
 */
export function ContentRow({
  title,
  description,
  href,
  action = "ดูทั้งหมด",
  children,
  className
}: {
  title: string;
  description?: string;
  href?: string;
  action?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    setCanScrollLeft(track.scrollLeft > 4);
    setCanScrollRight(track.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const track = trackRef.current;
    if (!track) return;

    track.addEventListener("scroll", updateArrows, { passive: true });
    const observer = new ResizeObserver(updateArrows);
    observer.observe(track);

    return () => {
      track.removeEventListener("scroll", updateArrows);
      observer.disconnect();
    };
  }, [updateArrows]);

  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * Math.round(track.clientWidth * 0.8), behavior: "smooth" });
  };

  return (
    <section className={cn("flex flex-col gap-3", className)} aria-label={title}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
          {description ? <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {href ? (
            <Link
              href={href}
              prefetch
              className="rounded-[8px] px-2 py-1 text-sm font-semibold text-[var(--brand-light-on-light)] hover:bg-muted"
            >
              {action} 
            </Link>
          ) : null}

          {/* ลูกศรเฉพาะ desktop — mobile ใช้นิ้วปัด */}
          <div className="hidden items-center gap-1 lg:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label={`เลื่อน ${title} ไปทางซ้าย`}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-opacity hover:bg-muted disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label={`เลื่อน ${title} ไปทางขวา`}
              className="grid h-9 w-9 place-items-center rounded-full border border-border bg-card transition-opacity hover:bg-muted disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={trackRef}
        className={cn(
          // ไม่ต้องมี padding-bottom เผื่อ scrollbar — scrollbar ถูกซ่อนอยู่แล้ว
          "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0",
          // ซ่อน scrollbar แต่ยังเลื่อนได้
          "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        )}
      >
        {children}
        {/* ตัวเว้นท้ายแถว ให้การ์ดสุดท้ายไม่ชิดขอบจอ */}
        <span aria-hidden className="w-1 shrink-0" />
      </div>
    </section>
  );
}

/** ห่อการ์ดแต่ละใบให้ snap — แยกออกมาเพื่อให้ ContentRow ไม่ต้องรู้จักชนิดการ์ด */
export function RowItem({ children }: { children: React.ReactNode }) {
  return <div className="snap-start">{children}</div>;
}
