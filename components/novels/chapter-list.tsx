"use client";

import { ArrowLeft, ArrowRight, LocateFixed, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { NovelCatalogResume, useNovelResumeProgress } from "@/components/reader/novel-resume-actions";
import { cn } from "@/lib/utils";
import { markChapterNavigation } from "@/stores/use-reader-store";
import type { ChapterCatalogOrder, ChapterCatalogPage, NovelResumeServerProgress } from "@/types/novel";

type ChapterListProps = {
  slug: string;
  catalog: ChapterCatalogPage;
  serverProgress?: NovelResumeServerProgress | null;
  latestChapterNumber?: number;
};

function formatChapterNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString("th-TH") : value.toLocaleString("th-TH", { maximumFractionDigits: 3 });
}

function formatRange(start: number, end: number) {
  return `${start.toLocaleString("th-TH")}–${end.toLocaleString("th-TH")}`;
}

export function ChapterList({
  slug,
  catalog,
  serverProgress,
  latestChapterNumber,
}: ChapterListProps) {
  const action = `/novel/${slug}/chapters`;
  const rangeCount = Math.ceil(catalog.catalogTotal / 100);
  const resume = useNovelResumeProgress(slug, serverProgress);
  const currentChapterNumber = resume?.progress.chapterNumber;
  const resultStart = catalog.total === 0 ? 0 : (catalog.page - 1) * catalog.pageSize + 1;
  const resultEnd = Math.min(catalog.page * catalog.pageSize, catalog.total);
  const selectedRangeEnd = catalog.rangeEnd ?? (catalog.rangeStart !== null ? Math.min(catalog.rangeStart + 99, catalog.catalogTotal) : null);
  const selectedRangeLabel = catalog.rangeStart !== null && selectedRangeEnd !== null
    ? `ลำดับ ${formatRange(catalog.rangeStart, selectedRangeEnd)}`
    : "ทุกตอน";
  const hasFilters = Boolean(catalog.query) || catalog.rangeStart !== null || catalog.order !== "latest";

  useEffect(() => {
    if (!catalog.jumpFound || catalog.jumpChapter === null) return;
    const frame = window.requestAnimationFrame(() => {
      const targets = Array.from(document.querySelectorAll<HTMLElement>('[data-jump-target="true"]'));
      const target = targets.find((item) => item.getClientRects().length > 0);
      if (!target) return;
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
  const pageHref = (page: number) => catalogHref({ page });

  return (
    <section aria-label="รายชื่อตอน" className="grid gap-3">
      <div className="rounded-(--r-lg) bg-card p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">ค้นหาและจัดช่วงตอน</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {catalog.total === 0
                ? "ไม่พบตอนที่ตรงกับเงื่อนไข"
                : `แสดง ${formatRange(resultStart, resultEnd)} จาก ${catalog.total.toLocaleString("th-TH")} ตอน`}
            </p>
          </div>
          {hasFilters ? (
            <Link href={action} className="inline-flex min-h-10 items-center gap-1.5 rounded-[6px] px-2 text-xs font-semibold text-[var(--brand-emphasis)] hover:bg-muted">
              <X className="h-3.5 w-3.5" />
              ล้างทั้งหมด
            </Link>
          ) : null}
        </div>

        <form action={action} method="get" role="search" className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_170px_96px]">
          <label className="relative">
            <span className="sr-only">ค้นหาตอนจากสารบัญทั้งหมด</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              defaultValue={catalog.query}
              placeholder="ค้นหาเลขตอนหรือชื่อตอนทั้งหมด"
              className="h-11 w-full rounded-[8px] border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-[var(--brand-emphasis)]"
            />
          </label>
          <label>
            <span className="sr-only">เรียงลำดับตอน</span>
            <select name="order" defaultValue={catalog.order} className="h-11 w-full rounded-[8px] border border-input bg-background px-3 text-sm">
              <option value="latest">ตอนล่าสุดก่อน</option>
              <option value="oldest">ตอนแรกก่อน</option>
            </select>
          </label>
          {catalog.rangeStart !== null ? <input type="hidden" name="from" value={catalog.rangeStart} /> : null}
          {catalog.rangeEnd !== null ? <input type="hidden" name="to" value={catalog.rangeEnd} /> : null}
          <button type="submit" className="h-11 rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
        </form>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {rangeCount > 1 ? (
            <form action={action} method="get" className="grid gap-2 rounded-[8px] bg-surface-subtle p-2 sm:grid-cols-[minmax(0,1fr)_108px] sm:items-end">
              <label className="grid gap-1">
                <span className="text-xs font-semibold text-muted-foreground">ช่วงตอน</span>
                <select id="chapter-range" name="from" defaultValue={catalog.rangeStart ?? 0} className="h-11 w-full rounded-[8px] border border-input bg-background px-3 text-sm">
                  <option value="0">ทุกตอน</option>
                  {Array.from({ length: rangeCount }, (_, index) => {
                    const start = index * 100 + 1;
                    const end = Math.min((index + 1) * 100, catalog.catalogTotal);
                    return <option key={start} value={start}>ลำดับ {formatRange(start, end)}</option>;
                  })}
                </select>
              </label>
              <input type="hidden" name="order" value={catalog.order} />
              {catalog.query ? <input type="hidden" name="q" value={catalog.query} /> : null}
              <button type="submit" className="h-11 rounded-[8px] border border-border px-4 text-sm font-semibold hover:border-[var(--brand-emphasis)]">แสดง</button>
            </form>
          ) : null}

          <form action={action} method="get" className="grid grid-cols-[minmax(0,1fr)_84px] gap-2 rounded-[8px] bg-surface-subtle p-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted-foreground">ไปตอนที่</span>
              <input name="jump" inputMode="decimal" placeholder="เช่น 120" className="h-11 w-full rounded-[8px] border border-input bg-background px-3 text-sm" />
            </label>
            <input type="hidden" name="order" value={catalog.order} />
            <button type="submit" className="inline-flex h-11 items-center justify-center gap-1.5 self-end rounded-[8px] border border-border text-sm font-semibold hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]">
              <LocateFixed className="h-4 w-4" />
              ไป
            </button>
          </form>
        </div>

        {hasFilters ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {catalog.query ? (
              <Link href={catalogHref({ page: 1, query: "" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--brand-primary)]/12 px-3 text-xs font-medium text-[var(--brand-emphasis)]">
                ค้นหา: {catalog.query}
                <X className="h-3.5 w-3.5" />
              </Link>
            ) : null}
            {catalog.rangeStart !== null ? (
              <Link href={catalogHref({ page: 1, rangeStart: null, rangeEnd: null })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--brand-primary)]/12 px-3 text-xs font-medium text-[var(--brand-emphasis)]">
                {selectedRangeLabel}
                <X className="h-3.5 w-3.5" />
              </Link>
            ) : null}
            {catalog.order !== "latest" ? (
              <Link href={catalogHref({ page: 1, order: "latest" })} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[var(--brand-primary)]/12 px-3 text-xs font-medium text-[var(--brand-emphasis)]">
                ตอนแรกก่อน
                <X className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      <NovelCatalogResume slug={slug} serverProgress={serverProgress} />

      {catalog.jumpChapter !== null && catalog.jumpFound ? (
        <p role="status" className="rounded-(--r-md) bg-[color-mix(in_srgb,var(--brand-primary)_7%,transparent)] px-4 py-3 text-sm text-foreground">
          กำลังแสดงตอนที่ {formatChapterNumber(catalog.jumpChapter)}
        </p>
      ) : catalog.jumpChapter !== null ? (
        <p role="status" className="rounded-(--r-md) bg-muted px-4 py-3 text-sm text-foreground">ไม่พบตอนที่ {formatChapterNumber(catalog.jumpChapter)} ในผลลัพธ์นี้</p>
      ) : null}

      <div className="overflow-hidden rounded-(--r-lg) bg-card">
        <div className="flex flex-wrap items-end justify-between gap-2 px-3 py-3 sm:px-4">
          <div>
            <p className="text-sm font-semibold">รายชื่อตอน</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{selectedRangeLabel}</p>
          </div>
          <span className="tabular rounded-full bg-surface-subtle px-3 py-1 text-xs text-muted-foreground">
            หน้า {catalog.page.toLocaleString("th-TH")} / {catalog.totalPages.toLocaleString("th-TH")}
          </span>
        </div>

        <ol className="grid gap-1.5 px-2 pb-2 sm:grid-cols-2 sm:px-3 sm:pb-3">
          {catalog.items.map((chapter) => {
            const isCurrent = chapter.number === currentChapterNumber;
            const isJumpTarget = catalog.jumpFound && chapter.number === catalog.jumpChapter;
            const isLatest = chapter.number === latestChapterNumber;
            return (
              <li
                key={chapter.id ?? chapter.number}
                data-jump-target={isJumpTarget ? "true" : undefined}
                className={cn(
                  "rounded-[6px] transition-colors",
                  isJumpTarget
                    ? "bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] outline outline-1 -outline-offset-1 outline-[var(--brand-emphasis)]"
                    : isCurrent
                      ? "bg-[color-mix(in_srgb,var(--brand-primary)_8%,transparent)]"
                      : "hover:bg-[color-mix(in_srgb,var(--brand-primary)_4%,transparent)]",
                )}
              >
                <Link
                  href={`/novel/${slug}/chapter/${chapter.number}`}
                  prefetch={false}
                  onClick={() => markChapterNavigation(slug, chapter.number)}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={`ตอนที่ ${formatChapterNumber(chapter.number)} ${chapter.title}${isCurrent ? " กำลังอ่าน" : ""}${isLatest ? " ตอนล่าสุด" : ""}`}
                  className="flex min-h-12 items-center px-3 py-2.5 font-medium leading-[1.55] transition-colors hover:text-[var(--brand-emphasis)] sm:px-4"
                >
                  <span className="line-clamp-2">{chapter.title}</span>
                  {isJumpTarget ? <span className="sr-only"> ตอนที่ค้นหา</span> : null}
                </Link>
              </li>
            );
          })}
        </ol>

        {catalog.items.length === 0 ? (
          <div className="px-3 pb-3">
            <div className="rounded-[8px] bg-surface-subtle p-8 text-center text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">ไม่พบตอนที่ตรงกับเงื่อนไข</p>
              <p className="mt-1">ลองล้างคำค้นหรือเลือกช่วงตอนใหม่</p>
              {hasFilters ? (
                <Link href={action} className="mt-4 inline-flex min-h-11 items-center rounded-[8px] bg-[var(--brand-primary)] px-4 font-semibold text-white">
                  ล้างตัวกรอง
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}

        {catalog.totalPages > 1 ? (
          <nav aria-label="แบ่งหน้าสารบัญ" className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 bg-muted/25 px-3 py-3 sm:px-4">
            {catalog.page > 1 ? (
              <Link href={pageHref(catalog.page - 1)} className="inline-flex min-h-11 items-center justify-self-start rounded-[8px] border border-border px-3 text-sm font-semibold hover:border-[var(--brand-emphasis)]">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                ก่อนหน้า
              </Link>
            ) : <span />}
            <span className="tabular text-sm text-muted-foreground">{catalog.page.toLocaleString("th-TH")} / {catalog.totalPages.toLocaleString("th-TH")}</span>
            {catalog.page < catalog.totalPages ? (
              <Link href={pageHref(catalog.page + 1)} className="inline-flex min-h-11 items-center justify-self-end rounded-[8px] border border-border px-3 text-sm font-semibold hover:border-[var(--brand-emphasis)]">
                ถัดไป
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            ) : <span />}
          </nav>
        ) : null}
      </div>
    </section>
  );
}
