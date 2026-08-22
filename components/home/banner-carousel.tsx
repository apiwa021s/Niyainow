"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export type BannerSlide = {
  id: string;
  image: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  href: string;
  ctaLabel?: string;
};

/** Multi-banner carousel — several promo slides visible at once, arrows on desktop, swipe on mobile. */
export function BannerCarousel({ slides }: { slides: BannerSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

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

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: direction * Math.round(track.clientWidth * 0.86), behavior: reduceMotion ? "auto" : "smooth" });
  }

  if (!slides.length) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="rail-scroll -mx-3 flex snap-x snap-mandatory gap-3 px-3 sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0"
      >
        {slides.map((slide) => (
          <Link
            key={slide.id}
            href={slide.href}
            className="group relative aspect-[4/3] w-[86%] shrink-0 snap-start overflow-hidden rounded-2xl sm:aspect-[16/10] sm:w-[58%] lg:w-[36%]"
          >
            <Image
              src={slide.image}
              alt=""
              fill
              sizes="(max-width: 640px) 86vw, (max-width: 1024px) 58vw, 36vw"
              priority
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              {slide.kicker ? (
                <span className="mb-2 inline-flex h-6 items-center rounded-full bg-white/90 px-2.5 text-xs font-bold text-rose-600">
                  {slide.kicker}
                </span>
              ) : null}
              <h2 className="line-clamp-2 text-lg font-bold leading-snug text-white drop-shadow-sm sm:text-xl">
                {slide.title}
              </h2>
              {slide.subtitle ? (
                <p className="mt-1 line-clamp-1 text-sm text-white/80">{slide.subtitle}</p>
              ) : null}
              <span className="mt-3 inline-flex h-9 items-center rounded-full bg-linear-to-r from-rose-500 to-fuchsia-500 px-4 text-sm font-semibold text-white shadow-sm transition-transform group-hover:scale-[1.03]">
                {slide.ctaLabel ?? "อ่านเลย"}
              </span>
            </div>
          </Link>
        ))}
        <span aria-hidden className="w-1 shrink-0" />
      </div>

      {canScrollLeft || canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden items-center justify-between px-1 lg:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!canScrollLeft}
            aria-label="เลื่อนแบนเนอร์ไปทางซ้าย"
            className={cn(
              "pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-700 shadow-md transition-opacity hover:bg-white",
              !canScrollLeft && "pointer-events-none opacity-0",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!canScrollRight}
            aria-label="เลื่อนแบนเนอร์ไปทางขวา"
            className={cn(
              "pointer-events-auto grid h-10 w-10 place-items-center rounded-full bg-white text-zinc-700 shadow-md transition-opacity hover:bg-white",
              !canScrollRight && "pointer-events-none opacity-0",
            )}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
