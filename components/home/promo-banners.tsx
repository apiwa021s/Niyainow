"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import type { PromoBannerItem } from "@/services/novel-service";

const AUTOPLAY_MS = 6_000;

/**
 * แบนเนอร์โปรโมทหน้าแรก (จัดการจากหลังบ้าน)
 * สไลด์ทีละใบ เลื่อนอัตโนมัติทุก 6 วินาที และวนกลับใบแรกเมื่อถึงใบสุดท้าย
 * ผู้ใช้คุมเองได้ด้วยปัดนิ้ว ปุ่มลูกศร จุดบอกตำแหน่ง หรือลูกศรบนคีย์บอร์ด
 *
 * ตำแหน่งสไลด์ใช้ scroll-snap ของเบราว์เซอร์เป็นแหล่งความจริง ปุ่มเพียงสั่ง scrollTo
 * จึงได้ทั้งการปัดนิ้วแบบเนทีฟและ reduced-motion โดยไม่ต้องเขียน animation เอง
 *
 * เนื้อหาเลื่อนเองต้องหยุดได้ (WCAG 2.2.2) จึงมีปุ่มหยุด/เล่น และหยุดให้เองเมื่อ
 * ผู้ใช้ hover, โฟกัสอยู่ในแบนเนอร์, สลับแท็บไปทำอย่างอื่น หรือตั้งค่าลดการเคลื่อนไหวไว้
 */
export function PromoBanners({ banners }: { banners: PromoBannerItem[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const total = banners.length;

  const scrollToIndex = useCallback((target: number, behavior: ScrollBehavior = "smooth") => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(target, track.children.length - 1));
    track.scrollTo({ left: clamped * track.clientWidth, behavior });
  }, []);

  // อ่านตำแหน่งจริงหลังผู้ใช้ปัด/เลื่อน แทนการเดาจาก state
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () => {
      const width = track.clientWidth;
      if (width > 0) setIndex(Math.round(track.scrollLeft / width));
    };
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, []);

  // ตั้งค่าลดการเคลื่อนไหวของระบบชนะเสมอ และเปลี่ยนระหว่างใช้งานได้ทันที
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // แท็บที่ซ่อนอยู่ไม่ควรเผาสไลด์ทิ้ง — ผู้ใช้กลับมาแล้วจะได้เห็นใบเดิม
  // (แยก effect ออกมาเพราะ listener ต้องอยู่ต่อแม้ autoplay จะหยุดไปแล้ว)
  const [tabHidden, setTabHidden] = useState(false);
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const autoplayActive = playing && !interacting && !tabHidden && !reducedMotion && total > 1;

  useEffect(() => {
    if (!autoplayActive) return;
    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track) return;
      const width = track.clientWidth;
      const current = width > 0 ? Math.round(track.scrollLeft / width) : 0;
      const next = (current + 1) % total;
      // วนกลับใบแรกแบบไม่ต้องเลื่อนย้อนยาวข้ามทุกใบ
      scrollToIndex(next, next === 0 ? "auto" : "smooth");
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [autoplayActive, total, scrollToIndex]);

  if (!total) return null;
  const multiple = total > 1;

  return (
    // เต็มขอบจอบนมือถือแบบเดียวกับ HomeHero แล้วเข้ากรอบมนบนจอใหญ่
    <section
      aria-roledescription={multiple ? "carousel" : undefined}
      aria-label="โปรโมชันและประกาศ"
      className="group/carousel relative -mx-4 sm:-mx-6 lg:mx-0"
      onKeyDown={(event) => {
        if (!multiple) return;
        if (event.key === "ArrowRight") scrollToIndex(index + 1);
        if (event.key === "ArrowLeft") scrollToIndex(index - 1);
      }}
      // เฉพาะเมาส์เท่านั้น — บนจอสัมผัส pointerenter ยิงตอนแตะแล้วไม่มี leave ตามมา
      // autoplay จะค้างถาวรหลังผู้ใช้แตะครั้งแรก
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setInteracting(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setInteracting(false); }}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setInteracting(false);
      }}
      // ตัวอ่านหน้าจอต้องรู้ว่าเนื้อหาส่วนนี้เปลี่ยนเอง
      aria-live={autoplayActive ? "off" : "polite"}
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
            // สไลด์ที่ยังไม่แสดงไม่ควรถูกโฟกัสหรืออ่านออกเสียง
            aria-hidden={multiple && position !== index ? true : undefined}
            inert={multiple && position !== index}
          >
            <BannerCard banner={banner} priority={position === 0} />
          </li>
        ))}
      </ul>

      {multiple ? (
        <>
          <SlideButton
            direction="prev"
            disabled={index === 0}
            onClick={() => scrollToIndex(index - 1)}
          />
          <SlideButton
            direction="next"
            disabled={index === total - 1}
            onClick={() => scrollToIndex(index + 1)}
          />

          {!reducedMotion ? (
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              aria-label={playing ? "หยุดเลื่อนแบนเนอร์อัตโนมัติ" : "เล่นแบนเนอร์อัตโนมัติ"}
              className="absolute bottom-3 right-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/65 sm:bottom-4 sm:right-4"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          ) : null}

          {/* จุดบอกตำแหน่งลอยทับมุมล่างของภาพ เพื่อไม่ให้ hero สูงเกิน 60vh */}
          <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center gap-2">
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
        // แตะง่ายบนมือถือ (44px) และจางลงจนกว่าจะ hover บนจอใหญ่
        "absolute top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-[var(--sh-2)] ring-1 ring-border backdrop-blur transition-opacity duration-[var(--dur-base)]",
        "disabled:pointer-events-none disabled:opacity-0",
        "lg:opacity-0 lg:group-hover/carousel:opacity-100 lg:group-focus-within/carousel:opacity-100",
        isPrev ? "left-3 sm:left-4" : "right-3 sm:right-4",
      )}
    >
      {isPrev ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
    </button>
  );
}

function BannerCard({ banner, priority }: { banner: PromoBannerItem; priority: boolean }) {
  const content = (
    <>
      <Image
        src={banner.image}
        alt={banner.title}
        fill
        sizes="(max-width: 1024px) 100vw, 1200px"
        priority={priority}
        className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:scale-[1.02]"
      />
      {/* ไล่เฉดทึบด้านล่างเพื่อให้ตัวอักษรอ่านออกบนภาพทุกแบบ */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/5" />
      <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col justify-end gap-2 p-6 pb-12 text-white sm:p-10 sm:pb-14 lg:px-10">
        <p className="max-w-2xl text-[1.75rem] font-bold leading-[1.3] sm:text-[2.5rem] sm:leading-[1.2]">{banner.title}</p>
        {banner.subtitle ? <p className="max-w-xl text-base leading-[1.75] text-white/85 sm:text-lg">{banner.subtitle}</p> : null}
        {banner.linkUrl && banner.ctaLabel ? (
          <span className="mt-3 flex h-12 w-fit items-center gap-2 rounded-[12px] bg-[image:var(--grad-primary)] px-6 text-base font-semibold shadow-[var(--sh-brand)] transition-transform duration-[var(--dur-fast)] group-active:translate-y-px">
            {banner.ctaLabel}
            <ArrowRight className="h-5 w-5" />
          </span>
        ) : null}
      </div>
    </>
  );

  // ความสูงเท่า HomeHero เพื่อไม่ให้หน้าแรกกระโดดเมื่อสลับระหว่างแบนเนอร์กับ hero มาตรฐาน
  const className =
    "group relative block h-[min(380px,60vh)] w-full overflow-hidden bg-muted shadow-[var(--sh-1)] lg:h-[min(480px,60vh)] lg:rounded-[24px]";

  if (!banner.linkUrl) return <div className={className}>{content}</div>;

  const external = banner.linkUrl.startsWith("http");
  return external ? (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={banner.linkUrl} prefetch className={className}>
      {content}
    </Link>
  );
}
