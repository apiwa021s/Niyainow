"use client";

import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronDown,
  LockKeyhole,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

import { NovelCatalogResume, useNovelResumeProgress } from "@/components/reader/novel-resume-actions";
import { cn } from "@/lib/utils";
import { markChapterNavigation } from "@/stores/use-reader-store";
import type {
  ChapterCatalogOrder,
  ChapterCatalogPage,
  ChapterSummary,
  NovelResumeServerProgress,
} from "@/types/novel";

type ChapterListProps = {
  slug: string;
  catalog: ChapterCatalogPage;
  serverProgress?: NovelResumeServerProgress | null;
  latestChapterNumber?: number;
  unlockedChapterIds?: string[];
  staffAccess?: boolean;
};

type ChapterRange = {
  start: number;
  end: number;
};

const chapterDateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

function formatChapterNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString("th-TH", { useGrouping: false })
    : value.toLocaleString("th-TH", { maximumFractionDigits: 3, useGrouping: false });
}

function formatRange(start: number, end: number) {
  return `${formatChapterNumber(start)} – ${formatChapterNumber(end)}`;
}

function chapterRanges(total: number, size: number, order: ChapterCatalogOrder): ChapterRange[] {
  if (total <= 0) return [];
  const ranges: ChapterRange[] = [];
  if (order === "latest") {
    for (let end = total; end > 0; end -= size) {
      ranges.push({ start: Math.max(1, end - size + 1), end });
    }
    return ranges;
  }
  for (let start = 1; start <= total; start += size) {
    ranges.push({ start, end: Math.min(total, start + size - 1) });
  }
  return ranges;
}

function pageRange(catalog: ChapterCatalogPage): ChapterRange {
  if (catalog.rangeStart !== null) {
    return {
      start: catalog.rangeStart,
      end: catalog.rangeEnd ?? Math.min(catalog.catalogTotal, catalog.rangeStart + catalog.pageSize - 1),
    };
  }
  if (catalog.order === "oldest") {
    const start = (catalog.page - 1) * catalog.pageSize + 1;
    return { start, end: Math.min(catalog.catalogTotal, start + catalog.pageSize - 1) };
  }
  const end = Math.max(1, catalog.catalogTotal - (catalog.page - 1) * catalog.pageSize);
  return { start: Math.max(1, end - catalog.pageSize + 1), end };
}

function rangeKey(range: ChapterRange) {
  return `${range.start}-${range.end}`;
}

function displayChapterTitle(chapter: ChapterSummary) {
  const title = chapter.title.trim();
  if (/^(?:ตอน|บท|chapter)\s*(?:ที่)?/iu.test(title)) return title;
  return `ตอนที่ ${formatChapterNumber(chapter.number)} ${title}`;
}

function displayChapterDate(chapter: ChapterSummary) {
  if (!chapter.publishedAt) return chapter.updatedAt;
  const date = new Date(chapter.publishedAt);
  return Number.isNaN(date.getTime()) ? chapter.updatedAt : `${chapterDateFormatter.format(date)} น.`;
}

function ChapterRows({
  slug,
  chapters,
  currentChapterNumber,
  latestChapterNumber,
  jumpChapter,
  jumpFound,
  unlockedChapterIds,
  staffAccess,
}: {
  slug: string;
  chapters: ChapterSummary[];
  currentChapterNumber?: number;
  latestChapterNumber?: number;
  jumpChapter: number | null;
  jumpFound: boolean;
  unlockedChapterIds: Set<string>;
  staffAccess: boolean;
}) {
  if (chapters.length === 0) {
    return (
      <div className="border-t border-border px-4 py-10 text-center">
        <p className="font-semibold">ไม่พบตอนที่ตรงกับเงื่อนไข</p>
        <p className="mt-1 text-sm text-muted-foreground">ลองค้นหาด้วยเลขตอนหรือชื่อที่สั้นลง</p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border border-t border-border">
      {chapters.map((chapter) => {
        const isCurrent = chapter.number === currentChapterNumber;
        const isJumpTarget = jumpFound && chapter.number === jumpChapter;
        const isLatest = chapter.number === latestChapterNumber;
        const title = displayChapterTitle(chapter);
        const isPaid = Boolean(chapter.locked && (chapter.coinPrice ?? 0) > 0);
        const isUnlocked = isPaid && (staffAccess || Boolean(chapter.id && unlockedChapterIds.has(chapter.id)));
        const isLocked = Boolean(chapter.locked && !isUnlocked);
        return (
          <li
            key={chapter.id ?? chapter.number}
            data-jump-target={isJumpTarget ? "true" : undefined}
            className={cn(
              "transition-colors",
              isJumpTarget
                ? "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] outline outline-1 -outline-offset-1 outline-[var(--brand-emphasis)]"
                : isCurrent
                  ? "bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)]"
                  : "hover:bg-surface-subtle",
            )}
          >
            <Link
              href={`/novel/${slug}/chapter/${chapter.number}`}
              prefetch={false}
              onClick={() => markChapterNavigation(slug, chapter.number)}
              aria-current={isCurrent ? "page" : undefined}
              aria-label={`${title}${isCurrent ? " กำลังอ่าน" : ""}${isLatest ? " ตอนล่าสุด" : ""}${isLocked ? ` ต้องใช้ ${chapter.coinPrice} เหรียญ` : ""}`}
              className="group flex min-h-20 items-start justify-between gap-4 px-4 py-4 sm:min-h-24 sm:px-5"
            >
              <span className="min-w-0">
                <span className="line-clamp-2 font-semibold leading-6 transition-colors group-hover:text-[var(--brand-emphasis)]">
                  {title}
                </span>
                {chapter.publishedAt ? (
                  <time dateTime={chapter.publishedAt} className="mt-2 block text-xs text-muted-foreground">
                    {displayChapterDate(chapter)}
                  </time>
                ) : (
                  <span className="mt-2 block text-xs text-muted-foreground">{displayChapterDate(chapter)}</span>
                )}
              </span>

              <span className="flex shrink-0 items-center gap-2 pt-0.5 text-xs font-semibold">
                {isCurrent ? (
                  <span className="hidden rounded-full bg-[var(--accent-subtle)] px-2 py-1 text-[var(--brand-emphasis)] sm:inline-flex">
                    กำลังอ่าน
                  </span>
                ) : isLatest ? (
                  <span className="hidden rounded-full bg-surface-subtle px-2 py-1 text-muted-foreground sm:inline-flex">
                    ล่าสุด
                  </span>
                ) : null}
                {isPaid ? (
                  isUnlocked ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300" title="ปลดล็อกแล้ว">
                      <Image src="/Images/Coins/nn-gold-coin.png" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      <span className="sr-only">ปลดล็อกแล้ว</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300" title={`${chapter.coinPrice} เหรียญ`}>
                      <Image src="/Images/Coins/nn-gold-coin.png" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
                      <span className="tabular">{chapter.coinPrice?.toLocaleString("th-TH")}</span>
                    </span>
                  )
                ) : isLocked ? (
                    <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-label="ตอนจำกัดสิทธิ์" />
                ) : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function ChapterList({
  slug,
  catalog,
  serverProgress,
  latestChapterNumber,
  unlockedChapterIds: unlockedChapterIdList = [],
  staffAccess = false,
}: ChapterListProps) {
  const action = `/novel/${slug}/chapters`;
  const resume = useNovelResumeProgress(slug, serverProgress);
  const currentChapterNumber = resume?.progress.chapterNumber;
  const ranges = chapterRanges(catalog.catalogTotal, catalog.pageSize, catalog.order);
  const activeRange = pageRange(catalog);
  const activeRangeKey = rangeKey(activeRange);
  const [collapsedRange, setCollapsedRange] = useState<string | null>(null);
  const unlockedChapterIds = new Set(unlockedChapterIdList);

  useEffect(() => {
    if (!catalog.jumpFound || catalog.jumpChapter === null) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('[data-jump-target="true"]');
      if (!target || target.getClientRects().length === 0) return;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      target.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [catalog.jumpChapter, catalog.jumpFound]);

  const catalogHref = ({
    page = 1,
    query = catalog.query,
    order = catalog.order,
    rangeStart = catalog.rangeStart,
    rangeEnd = catalog.rangeEnd,
  }: {
    page?: number;
    query?: string;
    order?: ChapterCatalogOrder;
    rangeStart?: number | null;
    rangeEnd?: number | null;
  } = {}) => {
    const params = new URLSearchParams();
    const normalizedQuery = (query ?? "").trim();
    if (normalizedQuery) params.set("q", normalizedQuery);
    if (order !== "latest") params.set("order", order);
    if (rangeStart !== null) {
      params.set("from", String(rangeStart));
      if (rangeEnd !== null) params.set("to", String(rangeEnd));
    }
    if (page > 1) params.set("page", String(page));
    const queryString = params.toString();
    return `${action}${queryString ? `?${queryString}` : ""}`;
  };

  const nextOrder: ChapterCatalogOrder = catalog.order === "latest" ? "oldest" : "latest";
  const nextOrderLabel = nextOrder === "oldest" ? "เรียงตอนแรกก่อน" : "เรียงตอนล่าสุดก่อน";

  return (
    <section aria-label="รายชื่อตอน" className="grid gap-4">
      <div className="flex items-stretch gap-2">
        <form action={action} method="get" role="search" className="min-w-0 flex-1">
          <div className="relative">
            <label>
              <span className="sr-only">ค้นหาลำดับหรือชื่อตอนจากสารบัญทั้งหมด</span>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                name="q"
                defaultValue={catalog.query}
                placeholder="ค้นหาลำดับหรือชื่อตอน..."
                className="h-11 w-full rounded-[8px] border border-input bg-surface-subtle pl-10 pr-11 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-[var(--brand-emphasis)] focus:bg-card"
              />
            </label>
            {catalog.query ? (
              <Link
                href={catalogHref({ query: "", rangeStart: null, rangeEnd: null, page: 1 })}
                aria-label="ล้างคำค้นหา"
                title="ล้างคำค้นหา"
                className="absolute right-1 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-[6px] text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </Link>
            ) : null}
          </div>
          {catalog.order !== "latest" ? <input type="hidden" name="order" value={catalog.order} /> : null}
          <button type="submit" className="sr-only">ค้นหา</button>
        </form>

        <Link
          href={catalogHref({ order: nextOrder, rangeStart: null, rangeEnd: null, page: 1 })}
          aria-label={nextOrderLabel}
          title={nextOrderLabel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] border border-border bg-card text-muted-foreground transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]"
        >
          {catalog.order === "latest" ? <ArrowDown className="h-5 w-5" aria-hidden /> : <ArrowUp className="h-5 w-5" aria-hidden />}
        </Link>
      </div>

      <NovelCatalogResume slug={slug} serverProgress={serverProgress} />

      {catalog.jumpChapter !== null && catalog.jumpFound ? (
        <p role="status" className="rounded-(--r-md) bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-4 py-3 text-sm text-foreground">
          กำลังแสดงตอนที่ {formatChapterNumber(catalog.jumpChapter)}
        </p>
      ) : catalog.jumpChapter !== null ? (
        <p role="status" className="rounded-(--r-md) bg-muted px-4 py-3 text-sm text-foreground">
          ไม่พบตอนที่ {formatChapterNumber(catalog.jumpChapter)} ในผลลัพธ์นี้
        </p>
      ) : null}

      {catalog.query ? (
        <div className="overflow-hidden rounded-(--r-lg) border border-border bg-card">
          <div className="flex min-h-14 items-center justify-between gap-3 bg-surface-subtle px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <h2 className="truncate font-semibold">ผลการค้นหา “{catalog.query}”</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">พบ {catalog.total.toLocaleString("th-TH")} ตอน</p>
            </div>
            <Link href={action} className="inline-flex min-h-10 shrink-0 items-center px-2 text-xs font-semibold text-[var(--brand-emphasis)]">
              ล้างการค้นหา
            </Link>
          </div>
          <ChapterRows
            slug={slug}
            chapters={catalog.items}
            currentChapterNumber={currentChapterNumber}
            latestChapterNumber={latestChapterNumber}
            jumpChapter={catalog.jumpChapter}
            jumpFound={catalog.jumpFound}
            unlockedChapterIds={unlockedChapterIds}
            staffAccess={staffAccess}
          />
          {catalog.totalPages > 1 ? (
            <nav aria-label="แบ่งหน้าผลการค้นหาตอน" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-t border-border bg-surface-subtle px-3 py-3 sm:px-4">
              {catalog.page > 1 ? (
                <Link href={catalogHref({ page: catalog.page - 1 })} className="inline-flex min-h-11 items-center justify-self-start rounded-[8px] border border-border bg-card px-3 text-sm font-semibold hover:border-[var(--brand-emphasis)]">
                  <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
                  ก่อนหน้า
                </Link>
              ) : <span />}
              <span className="tabular text-sm text-muted-foreground">{catalog.page.toLocaleString("th-TH")} / {catalog.totalPages.toLocaleString("th-TH")}</span>
              {catalog.page < catalog.totalPages ? (
                <Link href={catalogHref({ page: catalog.page + 1 })} className="inline-flex min-h-11 items-center justify-self-end rounded-[8px] border border-border bg-card px-3 text-sm font-semibold hover:border-[var(--brand-emphasis)]">
                  ถัดไป
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
                </Link>
              ) : <span />}
            </nav>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-(--r-lg) border border-border bg-card">
          {ranges.map((range, index) => {
            const key = rangeKey(range);
            const isActive = key === activeRangeKey;
            const isExpanded = isActive && collapsedRange !== key;
            const headerClassName = cn(
              "flex min-h-15 w-full items-center justify-between gap-3 px-4 py-3 text-left font-semibold transition-colors sm:px-5",
              index > 0 && "border-t border-border",
              isActive ? "bg-surface-subtle text-foreground" : "hover:bg-surface-subtle",
            );
            const headerContent = (
              <>
                <span className="tabular">{formatRange(range.start, range.end)}</span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} aria-hidden />
              </>
            );

            return (
              <section key={key} aria-label={`ตอนลำดับ ${formatRange(range.start, range.end)}`}>
                {isActive ? (
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    className={headerClassName}
                    onClick={() => setCollapsedRange((current) => current === key ? null : key)}
                  >
                    {headerContent}
                  </button>
                ) : (
                  <Link
                    href={catalogHref({ query: "", rangeStart: range.start, rangeEnd: range.end, page: 1 })}
                    aria-expanded="false"
                    className={headerClassName}
                  >
                    {headerContent}
                  </Link>
                )}

                {isExpanded ? (
                  <ChapterRows
                    slug={slug}
                    chapters={catalog.items}
                    currentChapterNumber={currentChapterNumber}
                    latestChapterNumber={latestChapterNumber}
                    jumpChapter={catalog.jumpChapter}
                    jumpFound={catalog.jumpFound}
                    unlockedChapterIds={unlockedChapterIds}
                    staffAccess={staffAccess}
                  />
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}
