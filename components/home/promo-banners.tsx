"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { PromoBannerItem } from "@/services/novel-service";

const AUTOPLAY_MS = 6_000;

/**
 * แบนเนอร์หลักหน้าแรก ใช้ scroll-snap เพื่อให้รองรับทั้งการปัดนิ้ว ปุ่มควบคุม
 * และแป้นพิมพ์ โดยหยุดการเลื่อนอัตโนมัติเมื่อผู้ใช้กำลังโต้ตอบกับแบนเนอร์
 */
export function PromoBanners({ banners }: { banners: PromoBannerItem[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const activeIndexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const total = banners.length;

  const scrollToIndex = useCallback((target: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(target, track.children.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const onScroll = () => {
      if (track.clientWidth > 0) {
        const nextIndex = Math.round(track.scrollLeft / track.clientWidth);
        activeIndexRef.current = nextIndex;
        setIndex(nextIndex);
      }
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => scrollToIndex(activeIndexRef.current, "auto"));
    observer.observe(track);
    return () => observer.disconnect();
  }, [scrollToIndex]);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const autoplayActive = playing && !interacting && !tabHidden && !reducedMotion && total > 1;

  useEffect(() => {
    if (!autoplayActive) return;

    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const current = track.clientWidth > 0 ? Math.round(track.scrollLeft / track.clientWidth) : 0;
      const next = (current + 1) % total;
      scrollToIndex(next, next === 0 ? "auto" : "smooth");
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [autoplayActive, scrollToIndex, total]);

  if (!total) return null;
  const multiple = total > 1;

  return (
    <section
      aria-roledescription={multiple ? "carousel" : undefined}
      aria-label="เรื่องแนะนำ"
      aria-live={autoplayActive ? "off" : "polite"}
      className="group/carousel relative -mx-4 sm:-mx-6 lg:mx-0"
      onKeyDown={(event) => {
        if (!multiple) return;
        if (event.key === "ArrowRight") scrollToIndex(index + 1);
        if (event.key === "ArrowLeft") scrollToIndex(index - 1);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setInteracting(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setInteracting(false);
      }}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
      }}
    >
      <ul
        ref={trackRef}
        className={cn(
          "flex overflow-x-auto",
          multiple && "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {banners.map((banner, position) => (
          <li
            key={banner.id}
            className="w-full shrink-0 snap-start"
            aria-roledescription={multiple ? "slide" : undefined}
            aria-label={multiple ? `${position + 1} จาก ${total}` : undefined}
            aria-hidden={multiple && position !== index ? true : undefined}
            inert={multiple && position !== index}
          >
            <BannerCard banner={banner} position={position} priority={position === 0} />
          </li>
        ))}
      </ul>

      {multiple ? (
        <>
          <SlideButton direction="prev" disabled={index === 0} onClick={() => scrollToIndex(index - 1)} />
          <SlideButton direction="next" disabled={index === total - 1} onClick={() => scrollToIndex(index + 1)} />

          {!reducedMotion ? (
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "หยุดเลื่อนแบนเนอร์อัตโนมัติ" : "เล่นแบนเนอร์อัตโนมัติ"}
              className="absolute bottom-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-[6px] bg-black/55 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/75 sm:bottom-5 sm:right-5"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          ) : null}

          <div className="absolute inset-x-16 bottom-5 z-20 flex justify-center gap-2 sm:bottom-6">
            {banners.map((banner, position) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => scrollToIndex(position)}
                aria-label={`ไปแบนเนอร์ที่ ${position + 1}: ${banner.title}`}
                aria-current={position === index ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full ring-1 ring-black/20 transition-all duration-[var(--dur-base)]",
                  position === index ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/75",
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function SlideButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const isPrev = direction === "prev";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrev ? "แบนเนอร์ก่อนหน้า" : "แบนเนอร์ถัดไป"}
      className={cn(
        "absolute top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/25 backdrop-blur transition-opacity duration-[var(--dur-base)] lg:grid",
        "disabled:pointer-events-none disabled:opacity-0 lg:opacity-0 lg:group-hover/carousel:opacity-100 lg:group-focus-within/carousel:opacity-100",
        isPrev ? "left-4" : "right-4",
      )}
    >
      {isPrev ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

function BannerCard({
  banner,
  position,
  priority,
}: {
  banner: PromoBannerItem;
  position: number;
  priority: boolean;
}) {
  const ctaLabel = banner.ctaLabel || "ดูรายละเอียด";
  const Heading = position === 0 ? "h1" : "h2";

  return (
    <article className="group/card relative isolate h-full overflow-hidden bg-[#0a0a0a] text-[#f5f3ef] lg:min-h-[440px] lg:rounded-[8px] lg:border lg:border-[#292929]">
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-black lg:absolute lg:inset-0 lg:aspect-auto">
        <Image
          src={banner.image}
          alt=""
          fill
          preload={priority}
          sizes="(max-width: 1024px) 100vw, 1400px"
          className="object-contain object-center transition-transform duration-700 ease-[var(--ease-out)] lg:object-cover lg:object-[70%_center] lg:group-hover/card:scale-[1.015]"
        />
      </div>
      <span aria-hidden className="absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(10,10,10,.98)_0%,rgba(10,10,10,.91)_42%,rgba(10,10,10,.42)_70%,rgba(10,10,10,.12)_100%)] lg:block" />
      <span aria-hidden className="absolute right-5 top-5 hidden border-r border-[#e02028]/70 pr-3 font-serif text-xs leading-[1.8] tracking-[.35em] text-white/55 [writing-mode:vertical-rl] lg:block">静かな物語を、あなたへ</span>

      <div className="relative flex min-h-[260px] max-w-[760px] flex-col px-5 pb-20 pt-7 sm:px-10 lg:min-h-[440px] lg:justify-center lg:px-14 lg:py-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="border border-[#c91820] bg-[#c91820]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ffb5b8]">เรื่องแนะนำ</span>
          <span className="editorial-kicker text-white/55">FEATURED STORY · {String(position + 1).padStart(2, "0")}</span>
        </div>

        <Heading className="mt-5 line-clamp-2 max-w-[640px] text-balance font-serif text-[clamp(2.25rem,8vw,3.45rem)] font-semibold leading-[1.18] sm:text-[clamp(2.75rem,5vw,3.45rem)]">
          {banner.title}
        </Heading>
        {banner.subtitle ? (
          <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-[1.9] text-white/75 sm:text-base">
            {banner.subtitle}
          </p>
        ) : null}

        {banner.linkUrl ? <BannerLink href={banner.linkUrl} label={ctaLabel} /> : null}
      </div>
    </article>
  );
}

function BannerLink({ href, label }: { href: string; label: string }) {
  const className = "mt-7 inline-flex h-12 w-fit items-center gap-2 rounded-[8px] bg-[#c91820] px-6 font-semibold text-white transition-colors hover:bg-[#e02028] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a]";
  const content = <>{label}<ArrowRight className="h-4 w-4" /></>;

  if (/^https?:\/\//i.test(href)) {
    return <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>;
  }

  return <Link href={href} className={className}>{content}</Link>;
}
