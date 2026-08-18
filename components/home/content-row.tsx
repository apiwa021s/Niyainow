"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { SectionHeader } from "@/components/ui/section-header";
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
  count,
  href,
  action = "ดูทั้งหมด",
  children,
  bleed = true,
  className
}: {
  title: string;
  description?: string;
  count?: number;
  href?: string;
  action?: string;
  children: React.ReactNode;
  bleed?: boolean;
  className?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const hasOverflow = canScrollLeft || canScrollRight;

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const maxScroll = track.scrollWidth - track.clientWidth;
    const overflows = maxScroll > 1;
    setCanScrollLeft(overflows && track.scrollLeft > 1);
    setCanScrollRight(overflows && track.scrollLeft < maxScroll - 1);
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
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({
      left: direction * Math.round(track.clientWidth * 0.8),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <section className={cn("flex flex-col gap-2.5", className)} aria-label={title}>
      <SectionHeader
        title={title}
        count={count}
        href={href}
        hrefLabel={action}
        trailing={hasOverflow ? (
          /* ลูกศรเฉพาะ desktop — mobile ใช้นิ้วปัด */
          <div className="hidden items-center overflow-hidden rounded-full border border-border bg-card shadow-(--sh-1) lg:flex">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              disabled={!canScrollLeft}
              aria-label={`เลื่อน ${title} ไปทางซ้าย`}
              className="grid h-10 w-10 place-items-center text-(--text-secondary) transition-colors hover:bg-muted hover:text-(--text-primary) disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              disabled={!canScrollRight}
              aria-label={`เลื่อน ${title} ไปทางขวา`}
              className="grid h-10 w-10 place-items-center border-l border-border text-(--text-secondary) transition-colors hover:bg-muted hover:text-(--text-primary) disabled:pointer-events-none disabled:opacity-35"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      />

      {description ? <p className="-mt-1 line-clamp-1 text-xs text-(--text-secondary)">{description}</p> : null}

      {/*
       * The bleed must match the page gutter exactly. It used to pull -16px
       * against a 12px gutter, which pushed 4px past the viewport on each side
       * and let the whole page scroll sideways on a phone.
       */}
      <div
        ref={trackRef}
        className={cn(
          "rail-scroll flex snap-x snap-mandatory gap-2.5",
          bleed ? "-mx-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0" : "mx-0 px-0",
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
export function RowItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("snap-start", className)}>{children}</div>;
}
