"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { ContinueReadingCard } from "@/components/novels/novel-card";
import { useNovelResumeProgress } from "@/components/reader/novel-resume-actions";
import { selectLatestLocalProgress, useReaderStore } from "@/stores/use-reader-store";
import type { Novel } from "@/types/novel";

export type GuestContinueReadingProps = {
  className?: string;
  excludeSlugs?: string[];
  title?: string;
};

export type AccountContinueItem = {
  novel: Novel;
  progressPercent: number | null;
  position: number | null;
  chapter: { number: number; title: string } | null;
  lastReadAt: string | null;
};

/**
 * A real local-only Continue Reading island. It renders nothing during SSR and
 * until persisted state has hydrated, so public pages never invent a reader or
 * emit mismatched markup. Signed-in pages may omit it when server sections are
 * available; their reader still maintains the same record as an offline fallback.
 */
export function GuestContinueReading({
  className,
  excludeSlugs = [],
  title = "อ่านต่อบนอุปกรณ์นี้",
}: GuestContinueReadingProps) {
  const hydrated = useReaderStore((state) => state.hasHydrated);
  const records = useReaderStore((state) => state.localProgress);
  const excluded = new Set(excludeSlugs);
  const availableRecords = Object.fromEntries(
    Object.entries(records).filter(([slug]) => !excluded.has(slug)),
  );
  const progress = hydrated ? selectLatestLocalProgress(availableRecords) : null;
  if (!progress) return null;

  const percent = Math.max(0, Math.min(100, Math.round(progress.progressPercent)));
  const href = `/novel/${progress.novelSlug}/chapter/${progress.chapterNumber}`;

  return (
    <section className={cn("space-y-3", className)} aria-labelledby="guest-continue-title">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 h-10 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
        <div>
          <p className="editorial-kicker">CONTINUE / LOCAL</p>
          <h2 id="guest-continue-title" className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h2>
        </div>
      </div>

      <Link
        href={href}
        className="group grid min-h-[116px] grid-cols-[68px_minmax(0,1fr)_auto] items-center gap-4 rounded-[8px] border border-border bg-card p-3 transition-colors hover:border-[var(--brand-emphasis)]/55"
      >
        <span className="relative aspect-[2/3] w-[68px] overflow-hidden rounded-[5px] bg-muted">
          <Image src={progress.cover} alt="" fill sizes="68px" className="object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-serif text-base font-semibold">{progress.novelTitle}</span>
          <span className="mt-1 block truncate text-sm text-muted-foreground">
            ตอนที่ {progress.chapterNumber}: {progress.chapterTitle}
          </span>
          <span className="mt-3 flex items-center gap-2">
            <span
              role="progressbar"
              aria-label={`อ่านตอนนี้ไป ${percent}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1.5 min-w-0 flex-1 overflow-hidden bg-muted"
            >
              <span className="block h-full bg-[var(--brand-primary)]" style={{ width: `${percent}%` }} />
            </span>
            <span className="tabular text-xs text-muted-foreground">{percent}%</span>
          </span>
        </span>
        <span className="hidden min-h-11 items-center gap-1 rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white sm:inline-flex">
          อ่านต่อ <ArrowRight className="h-4 w-4" />
        </span>
      </Link>
    </section>
  );
}

/**
 * Server markup starts with the account record, then upgrades to a fresher
 * device record after hydration. This keeps the first paint deterministic
 * without sending browser-only progress through the server.
 */
export function AccountContinueReadingCard({ item }: { item: AccountContinueItem }) {
  const local = useReaderStore((state) => state.localProgress[item.novel.slug]);
  const serverProgress = item.chapter && item.lastReadAt
    ? {
        chapterNumber: item.chapter.number,
        chapterTitle: item.chapter.title,
        progressPercent: item.progressPercent ?? 0,
        position: item.position ?? 0,
        lastReadAt: item.lastReadAt,
      }
    : null;
  const selection = useNovelResumeProgress(item.novel.slug, serverProgress);
  const chapterNumber = selection?.progress.chapterNumber ?? item.chapter?.number ?? 1;
  const chapterTitle = selection?.source === "local"
    ? local?.chapterTitle
    : selection?.progress.chapterTitle ?? item.chapter?.title;

  return (
    <ContinueReadingCard
      novel={item.novel}
      href={`/novel/${item.novel.slug}/chapter/${chapterNumber}`}
      chapterLabel={`ตอนที่ ${chapterNumber}${chapterTitle ? `: ${chapterTitle}` : ""}`}
      progress={selection?.progress.progressPercent ?? item.progressPercent ?? 0}
      meta={selection?.source === "local" ? "ตำแหน่งล่าสุดบนอุปกรณ์นี้" : "บันทึกในบัญชี"}
    />
  );
}
