import Image from "next/image";
import Link from "next/link";

import { ContentRow, RowItem } from "@/components/home/content-row";
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
    <ContentRow title="กำลังมาแรงสัปดาห์นี้" href="/rankings" action="อันดับทั้งหมด">
      {/*
       * The row's accessible names come from aria-label on each link, not from
       * an sr-only span. An sr-only span is position:absolute, and with every
       * ancestor static its containing block resolves *outside* this scroll
       * container — so it escapes the clip and stretches the whole document's
       * scrollable width, which made the page pan sideways on a phone.
       * `relative` on the item keeps any future absolute child contained.
      */}
      {novels.map((novel, index) => (
        <RowItem key={novel.slug} className="relative shrink-0">
          <Link
            href={`/novel/${novel.slug}`}
            aria-label={`อันดับ ${index + 1} ${novel.thaiTitle} — ${formatNumber(novel.views)} ครั้ง`}
            className="group grid w-[154px] grid-cols-[38px_minmax(0,1fr)] gap-2 rounded-(--r-md) border border-border bg-card p-1.5 transition-colors hover:border-accent-base hover:bg-surface-subtle"
          >
            <span className="relative aspect-2/3 w-[38px] overflow-hidden rounded-(--r-sm) bg-surface-recessed ring-1 ring-border">
              <Image src={novel.cover} alt="" fill sizes="38px" className="object-cover" />
              <span
                aria-hidden
                className="tabular absolute left-0 top-0 rounded-br-(--r-sm) bg-black/70 px-1 text-xs font-semibold leading-[1.35] text-white"
              >
                {index + 1}
              </span>
            </span>
            <span aria-hidden className="min-w-0 self-center">
              <span className="block truncate text-xs font-semibold transition-colors group-hover:text-accent-base">
                {novel.thaiTitle}
              </span>
              <span className="tabular mt-0.5 block truncate text-xs text-(--text-secondary)">
                {novel.genreNames?.[novel.genres[0]] ? `${novel.genreNames[novel.genres[0]]} · ` : ""}{formatNumber(novel.views)} ครั้ง
              </span>
            </span>
          </Link>
        </RowItem>
      ))}
    </ContentRow>
  );
}
