"use client";

import Image from "next/image";
import { BookOpen, ChevronLeft, ChevronRight, Eye, Play, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandGlyph, BrandMark } from "@/components/brand/brand-mark";
import { FollowButton } from "@/components/interactive/novel-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import type { Novel } from "@/types/novel";

export function HeroCarousel({ novels }: { novels: Novel[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = novels[index] ?? novels[0];

  useEffect(() => {
    if (paused || novels.length < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % novels.length), 5500);
    return () => window.clearInterval(timer);
  }, [paused, novels.length]);

  if (!active) return null;

  return (
    <section className="surface-elevated relative overflow-hidden rounded-lg border border-white/10 bg-card" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="absolute inset-0">
        <Image src={active.backdrop} alt={active.thaiTitle} fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/86 to-background/28" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
      <div className="relative grid min-h-[380px] items-end gap-5 p-4 sm:min-h-[420px] sm:p-6 lg:min-h-[430px] lg:grid-cols-[1fr_240px] lg:items-center">
        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-md border border-white/12 bg-white/8 px-2.5 py-1.5 text-xs font-semibold text-[var(--brand-fresh)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
            <BrandGlyph type="fast" className="h-6 w-6 border-white/10 bg-primary/20" iconClassName="h-3.5 w-3.5" />
            นิยายเด่นประจำวันนี้
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white">{active.genres[0]}</span>
            <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-[var(--brand-accent)] text-[var(--brand-accent)]" />{active.rating}</span>
            <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatNumber(active.views)}</span>
            <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{active.chapters} ตอน</span>
          </div>
          <div>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-normal sm:text-5xl">{active.thaiTitle}</h1>
            <p className="mt-2 text-base font-medium text-muted-foreground sm:text-lg">{active.title}</p>
          </div>
          <p className="line-clamp-2 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{active.synopsis}</p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href={`/novel/${active.slug}/chapter/1`} size="lg"><Play className="h-5 w-5 fill-current" />เริ่มอ่าน</ButtonLink>
            <FollowButton slug={active.slug} />
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-white/12 shadow-2xl">
            <Image src={active.cover} alt={active.thaiTitle} fill sizes="240px" className="object-cover" />
            <div className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg bg-[#130537]/88 ring-1 ring-white/15 backdrop-blur">
              <BrandMark className="h-8 w-8" />
            </div>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="text-sm font-semibold text-white">อ่านได้ทันที</p>
              <p className="text-xs text-white/70">ตอนล่าสุด: {active.chapters}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <Button variant="secondary" size="icon" onClick={() => setIndex((value) => (value - 1 + novels.length) % novels.length)} aria-label="ก่อนหน้า">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1">
          {novels.map((novel, dotIndex) => (
            <button key={novel.slug} onClick={() => setIndex(dotIndex)} className={cn("h-2 w-2 rounded-full bg-white/40 transition-all", dotIndex === index && "w-6 bg-white")} aria-label={`เปิด ${novel.thaiTitle}`} />
          ))}
        </div>
        <Button variant="secondary" size="icon" onClick={() => setIndex((value) => (value + 1) % novels.length)} aria-label="ถัดไป">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
