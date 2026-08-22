"use client";

import { Crown, Eye, Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import { cn, formatNumber } from "@/lib/utils";
import type { Novel } from "@/types/novel";

type SortMode = "popular" | "views" | "likes";
type PeriodMode = "daily" | "weekly" | "monthly";

const SORT_TABS: { value: SortMode; label: string }[] = [
  { value: "views", label: "ยอดวิว" },
  { value: "popular", label: "ยอดนิยม" },
  { value: "likes", label: "ยอดถูกใจ" },
];

const PERIOD_TABS: { value: PeriodMode; label: string }[] = [
  { value: "daily", label: "1 วัน" },
  { value: "weekly", label: "7 วัน" },
  { value: "monthly", label: "30 วัน" },
];

const RANK_COLORS = ["text-amber-500", "text-zinc-400", "text-orange-600"];

function sortNovels(novels: Novel[], mode: SortMode): Novel[] {
  if (mode === "views") return [...novels].sort((a, b) => b.views - a.views);
  if (mode === "likes") return [...novels].sort((a, b) => (b.bookmarkCount ?? 0) - (a.bookmarkCount ?? 0));
  return novels;
}

function RankRow({ novel, rank }: { novel: Novel; rank: number }) {
  return (
    <Link
      href={`/novel/${novel.slug}`}
      className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-muted/50"
    >
      <span className="grid w-7 shrink-0 place-items-center">
        {rank <= 3 ? (
          <Crown className={cn("h-5 w-5", RANK_COLORS[rank - 1])} aria-label={`อันดับ ${rank}`} />
        ) : (
          <span className="tabular text-sm font-bold text-(--text-tertiary)">{rank}</span>
        )}
      </span>
      <div className="relative aspect-2/3 w-11 shrink-0 overflow-hidden rounded-[6px] bg-muted">
        <Image src={novel.cover} alt="" fill sizes="44px" className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--brand-emphasis)]">
          {novel.thaiTitle}
        </p>
        <p className="tabular mt-0.5 flex items-center gap-3 text-xs text-(--text-tertiary)">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" aria-hidden />{formatNumber(novel.views)}</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" aria-hidden />{formatNumber(novel.bookmarkCount ?? 0)}</span>
        </p>
      </div>
    </Link>
  );
}

/** Two-column ranking board with sort + time-range tabs (all real fields: views, bookmarkCount, rank order). */
export function RankingTabs({
  daily,
  weekly,
  monthly,
}: {
  daily: Novel[];
  weekly: Novel[];
  monthly: Novel[];
}) {
  const [sort, setSort] = useState<SortMode>("popular");
  const [period, setPeriod] = useState<PeriodMode>("weekly");

  const source = period === "daily" ? daily : period === "monthly" ? monthly : weekly;
  const ranked = useMemo(() => sortNovels(source, sort).slice(0, 10), [source, sort]);
  const left = ranked.slice(0, 5);
  const right = ranked.slice(5, 10);

  if (!ranked.length) return null;

  return (
    <section aria-labelledby="home-ranking-title" className="render-deferred rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="home-ranking-title" className="text-h2 font-semibold">จัดอันดับนิยาย</h2>
        <div role="tablist" aria-label="ช่วงเวลาจัดอันดับ" className="inline-flex rounded-full border border-border bg-muted/40 p-0.5">
          {PERIOD_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={period === tab.value}
              onClick={() => setPeriod(tab.value)}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-semibold transition-colors",
                period === tab.value ? "bg-linear-to-r from-rose-500 to-fuchsia-500 text-white" : "text-(--text-secondary)",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div role="tablist" aria-label="เรียงลำดับตาม" className="mt-3 flex gap-1.5">
        {SORT_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={sort === tab.value}
            onClick={() => setSort(tab.value)}
            className={cn(
              "h-9 rounded-full border px-3.5 text-sm font-medium transition-colors",
              sort === tab.value
                ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"
                : "border-border text-(--text-secondary) hover:bg-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-x-6 md:grid-cols-2">
        <div>{left.map((novel, index) => <RankRow key={novel.slug} novel={novel} rank={index + 1} />)}</div>
        <div>{right.map((novel, index) => <RankRow key={novel.slug} novel={novel} rank={index + 6} />)}</div>
      </div>
    </section>
  );
}
