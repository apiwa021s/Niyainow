import Image from "next/image";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { formatNumber } from "@/lib/utils";
import type { Novel } from "@/types/novel";

/**
 * A single dense strip of the week's most-read titles, sitting directly under
 * the hero. It costs ~76px and puts a dozen real covers plus their real view
 * counts inside the first viewport, which is most of how the home page hits
 * the "8 titles above the fold" bar (brief §6.2).
 */
export function TrendingTicker({ novels }: { novels: Novel[] }) {
  if (novels.length === 0) return null;

  return (
    <section aria-label="เรื่องที่มีผู้อ่านมากที่สุดสัปดาห์นี้" className="rounded-(--r-lg) border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 shrink-0 text-accent-base" aria-hidden />
          <span className="truncate">กำลังมาแรงสัปดาห์นี้</span>
        </p>
        <Link href="/rankings" className="shrink-0 text-xs font-semibold text-(--text-secondary) hover:text-accent-base">
          อันดับทั้งหมด
        </Link>
      </div>
      {/*
       * The row's accessible names come from aria-label on each link, not from
       * an sr-only span. An sr-only span is position:absolute, and with every
       * ancestor static its containing block resolves *outside* this scroll
       * container — so it escapes the clip and stretches the whole document's
       * scrollable width, which made the page pan sideways on a phone.
       * `relative` on the item keeps any future absolute child contained.
       */}
      <ol className="rail-scroll -mx-1 flex gap-2 px-1">
        {novels.map((novel, index) => (
          <li key={novel.slug} className="relative shrink-0">
            <Link
              href={`/novel/${novel.slug}`}
              aria-label={`อันดับ ${index + 1} ${novel.thaiTitle} — ${formatNumber(novel.views)} ครั้ง`}
              className="group grid w-[184px] grid-cols-[44px_minmax(0,1fr)] gap-2 rounded-(--r-md) border border-border bg-card p-2 transition-colors hover:border-accent-base hover:bg-surface-subtle"
            >
              <span className="relative aspect-2/3 w-11 overflow-hidden rounded-(--r-sm) bg-surface-recessed ring-1 ring-border">
                <Image src={novel.cover} alt="" fill sizes="56px" className="object-cover" />
                <span
                  aria-hidden
                  className="tabular absolute left-0 top-0 rounded-br-(--r-sm) bg-black/70 px-1 text-xs font-semibold leading-[1.4] text-white"
                >
                  {index + 1}
                </span>
              </span>
              <span aria-hidden className="min-w-0 self-center">
                <span className="block truncate text-sm font-semibold transition-colors group-hover:text-accent-base">
                  {novel.thaiTitle}
                </span>
                <span className="tabular mt-0.5 block text-xs text-(--text-secondary)">
                  {formatNumber(novel.views)} ครั้ง
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
