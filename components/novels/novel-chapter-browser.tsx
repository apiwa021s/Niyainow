"use client";

import { ChevronDown, ListOrdered, LoaderCircle, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { NovelLibraryStatus } from "@/components/interactive/novel-actions";
import { NovelResumeMobileBar } from "@/components/reader/novel-resume-actions";
import { cn, formatNumber } from "@/lib/utils";
import type {
  ChapterCatalogOrder,
  ChapterCatalogPage,
  ChapterSummary,
  NovelResumeServerProgress,
} from "@/types/novel";

type ChapterRange = {
  start: number;
  end: number;
};

type NovelChapterBrowserProps = {
  slug: string;
  firstChapters: ChapterSummary[];
  latestChapters: ChapterSummary[];
  chapterCount: number;
  startHref: string;
  startLabel: string;
  serverProgress?: NovelResumeServerProgress | null;
  libraryStatus?: NovelLibraryStatus | null;
};

function formatChapterNumber(value: number) {
  return value.toLocaleString("th-TH", {
    maximumFractionDigits: 3,
    useGrouping: false,
  });
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

function rangeLabel(range: ChapterRange) {
  return `${formatChapterNumber(range.start)}–${formatChapterNumber(range.end)}`;
}

function ChapterRows({
  slug,
  chapters,
  onNavigate,
}: {
  slug: string;
  chapters: ChapterSummary[];
  onNavigate?: () => void;
}) {
  return (
    <ol className="divide-y divide-border">
      {chapters.map((chapter) => (
        <li key={chapter.id ?? chapter.number}>
          <Link
            href={`/novel/${slug}/chapter/${chapter.number}`}
            onClick={onNavigate}
            className="group grid min-h-14 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle sm:px-5"
          >
            <span className="tabular text-xs font-semibold text-muted-foreground">
              {formatChapterNumber(chapter.number)}
            </span>
            <span className="line-clamp-1 text-sm font-medium transition-colors group-hover:text-[var(--brand-emphasis)]">
              {chapter.title}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function OrderToggle({
  order,
  onChange,
}: {
  order: ChapterCatalogOrder;
  onChange: (order: ChapterCatalogOrder) => void;
}) {
  return (
    <div className="grid h-11 grid-cols-2 rounded-[8px] border border-border bg-surface-subtle p-1" role="group" aria-label="เรียงสารบัญ">
      {(["oldest", "latest"] as const).map((value) => {
        const active = order === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(value)}
            className={cn(
              "min-w-24 rounded-[5px] px-3 text-xs font-semibold transition-colors",
              active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-[var(--brand-emphasis)]",
            )}
          >
            {value === "oldest" ? "ตอนแรก" : "ตอนล่าสุด"}
          </button>
        );
      })}
    </div>
  );
}

export function NovelChapterBrowser({
  slug,
  firstChapters,
  latestChapters,
  chapterCount,
  startHref,
  startLabel,
  serverProgress,
  libraryStatus,
}: NovelChapterBrowserProps) {
  const [order, setOrder] = useState<ChapterCatalogOrder>("latest");
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState<ChapterCatalogPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadCatalog = useCallback(async (nextOrder: ChapterCatalogOrder, range?: ChapterRange) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError(false);

    const params = new URLSearchParams({ order: nextOrder });
    if (range) {
      params.set("from", String(range.start));
      params.set("to", String(range.end));
    }

    try {
      const response = await fetch(`/api/novels/${encodeURIComponent(slug)}/chapters?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("chapter_catalog_failed");
      setCatalog(await response.json() as ChapterCatalogPage);
    } catch (loadError) {
      if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setError(true);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, [slug]);

  const openCatalog = useCallback(() => {
    setOpen(true);
    void loadCatalog(order);
  }, [loadCatalog, order]);

  const changeOrder = useCallback((nextOrder: ChapterCatalogOrder) => {
    setOrder(nextOrder);
    if (open) void loadCatalog(nextOrder);
  }, [loadCatalog, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => () => requestRef.current?.abort(), []);

  const previewChapters = (order === "oldest" ? firstChapters : latestChapters)
    .slice()
    .sort((left, right) => order === "oldest" ? left.number - right.number : right.number - left.number);
  const total = catalog?.catalogTotal ?? chapterCount;
  const ranges = chapterRanges(total, catalog?.pageSize ?? 50, order);
  const activeRange = catalog?.rangeStart !== null && catalog?.rangeStart !== undefined
    ? { start: catalog.rangeStart, end: catalog.rangeEnd ?? catalog.rangeStart }
    : ranges[0];

  return (
    <>
      <section id="novel-chapters" aria-labelledby="chapter-preview-title">
        <div className="mb-3 flex min-h-11 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ListOrdered className="h-5 w-5 shrink-0 text-[var(--brand-light-on-light)]" aria-hidden />
            <h2 id="chapter-preview-title" className="text-h2 font-semibold">สารบัญ</h2>
            <span className="text-sm text-muted-foreground">{formatNumber(chapterCount)} ตอน</span>
          </div>
          <div className="hidden md:block">
            <OrderToggle order={order} onChange={changeOrder} />
          </div>
        </div>

        <button
          type="button"
          onClick={openCatalog}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="novel-chapter-dialog"
          className="flex min-h-14 w-full items-center justify-between rounded-(--r-md) border border-border bg-card px-4 text-left text-sm font-semibold transition-colors hover:bg-surface-subtle md:hidden"
        >
          <span>เปิดสารบัญและเลือกตอน</span>
          <ChevronDown className="h-5 w-5 text-muted-foreground" aria-hidden />
        </button>

        <div className="hidden overflow-hidden rounded-(--r-md) border border-border bg-card md:block">
          <ChapterRows slug={slug} chapters={previewChapters} />
          <button
            type="button"
            onClick={openCatalog}
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-controls="novel-chapter-dialog"
            className="min-h-12 w-full border-t border-border px-4 text-sm font-semibold text-[var(--brand-emphasis)] hover:bg-surface-subtle"
          >
            เปิดสารบัญทั้งหมด
          </button>
        </div>
      </section>

      <NovelResumeMobileBar
        slug={slug}
        startHref={startHref}
        startLabel={startLabel}
        serverProgress={serverProgress}
        libraryStatus={libraryStatus}
        onOpenChapters={openCatalog}
      />

      {open ? (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/55"
            onClick={() => setOpen(false)}
            aria-label="ปิดสารบัญ"
          />
          <div
            id="novel-chapter-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="novel-chapter-dialog-title"
            className="motion-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[14px] bg-background pb-[env(safe-area-inset-bottom)] md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[82dvh] md:w-[680px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-(--r-lg) md:border md:border-border"
          >
            <div aria-hidden className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-border md:hidden" />
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div>
                <h2 id="novel-chapter-dialog-title" className="text-xl font-semibold">สารบัญ</h2>
                <p className="text-xs text-muted-foreground">{formatNumber(total)} ตอน</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="ปิดสารบัญ"
                className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-muted"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="grid shrink-0 gap-3 border-b border-border px-4 py-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:px-5">
              <OrderToggle order={order} onChange={changeOrder} />
              {ranges.length > 1 ? (
                <nav aria-label="ช่วงตอน" className="rail-scroll flex gap-2 overflow-x-auto sm:justify-end">
                  {ranges.map((range) => {
                    const active = activeRange?.start === range.start && activeRange.end === range.end;
                    return (
                      <button
                        key={`${range.start}-${range.end}`}
                        type="button"
                        aria-pressed={active}
                        onClick={() => void loadCatalog(order, range)}
                        className={cn(
                          "min-h-10 shrink-0 rounded-full border px-3 text-xs font-semibold",
                          active
                            ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"
                            : "border-border text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {rangeLabel(range)}
                      </button>
                    );
                  })}
                </nav>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto" aria-live="polite" aria-busy={loading}>
              {loading ? (
                <div className="grid min-h-48 place-items-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><LoaderCircle className="h-5 w-5 animate-spin" aria-hidden />กำลังโหลดสารบัญ</span>
                </div>
              ) : error ? (
                <div className="grid min-h-48 place-items-center px-5 text-center">
                  <div>
                    <p className="font-semibold">โหลดสารบัญไม่สำเร็จ</p>
                    <button type="button" onClick={() => void loadCatalog(order)} className="mt-3 min-h-11 rounded-[8px] border border-border px-4 text-sm font-semibold hover:bg-muted">ลองอีกครั้ง</button>
                  </div>
                </div>
              ) : catalog?.items.length ? (
                <ChapterRows slug={slug} chapters={catalog.items} onNavigate={() => setOpen(false)} />
              ) : (
                <p className="px-5 py-12 text-center text-sm text-muted-foreground">ยังไม่มีตอนที่เผยแพร่</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
