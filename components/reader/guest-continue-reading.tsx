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
    <section className={cn("flex flex-col", className)} aria-labelledby="guest-continue-title">
      <h2 id="guest-continue-title" className="mb-2.5 flex h-8 items-center text-h2 font-semibold">
        {title}
      </h2>

      {/*
       * The cover column is fixed and the text column is minmax(0,1fr) so a long
       * Thai title truncates instead of forcing the card wider than the phone.
       * The CTA is a separate column only from sm up; at 360px the whole card is
       * the tap target and the arrow would just eat the title's width.
       */}
      <Link
        href={href}
        className="group grid grid-cols-[56px_minmax(0,1fr)] items-center gap-3 rounded-(--r-lg) border border-border bg-surface p-2.5 transition-colors hover:border-accent-base sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:gap-4 sm:p-3"
      >
        <span className="relative aspect-2/3 w-14 overflow-hidden rounded-(--r-sm) bg-surface-recessed sm:w-17">
          <Image src={progress.cover} alt="" fill sizes="68px" className="object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body font-semibold">{progress.novelTitle}</span>
          <span className="mt-0.5 block truncate text-sm text-(--text-secondary)">
            ตอนที่ {progress.chapterNumber}: {progress.chapterTitle}
          </span>
          <span className="mt-2 flex items-center gap-2">
            <span
              role="progressbar"
              aria-label={`อ่านตอนนี้ไป ${percent}%`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-recessed"
            >
              <span className="block h-full bg-accent-base" style={{ width: `${percent}%` }} />
            </span>
            <span className="tabular shrink-0 text-xs text-(--text-tertiary)">{percent}%</span>
          </span>
        </span>
        <span className="hidden min-h-11 items-center gap-1 rounded-full bg-accent-base px-4 text-sm font-semibold text-accent-on sm:inline-flex">
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
