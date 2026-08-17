import Image from "next/image";
import Link from "next/link";

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
    <section aria-label="เรื่องที่มีผู้อ่านมากที่สุดสัปดาห์นี้" className="rounded-(--r-lg) border border-border bg-surface p-2">
      <ol className="rail-scroll flex gap-2">
        {novels.map((novel, index) => (
          <li key={novel.slug} className="shrink-0">
            <Link
              href={`/novel/${novel.slug}`}
              className="group flex w-14 flex-col items-center gap-1"
              title={novel.thaiTitle}
            >
              <span className="relative aspect-[2/3] w-full overflow-hidden rounded-(--r-sm) bg-surface-recessed ring-1 ring-border transition-[box-shadow] group-hover:ring-2 group-hover:ring-accent-base">
                <Image src={novel.cover} alt="" fill sizes="56px" className="object-cover" />
                <span className="tabular absolute left-0 top-0 rounded-br-(--r-sm) bg-black/70 px-1 text-xs font-semibold leading-[1.4] text-white">
                  {index + 1}
                </span>
              </span>
              <span className="sr-only">{novel.thaiTitle}</span>
              <span className="tabular text-xs font-semibold text-accent-base">{formatNumber(novel.views)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
