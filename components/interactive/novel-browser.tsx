"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";

import { FilterPanel } from "@/components/browse/filter-panel";
import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";
import { Select } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { novelBrowseHref } from "@/lib/validation/public-query";
import type { GenreFacet } from "@/services/novel-service";
import { parseGenreParam, type NovelQuery, type NovelSort } from "@/types/novel-query";

const SORT_OPTIONS: { value: NovelSort; label: string }[] = [
  { value: "popular", label: "ยอดนิยม" },
  { value: "updated", label: "อัปเดตล่าสุด" },
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "new", label: "มาใหม่" },
  { value: "chapters", label: "จำนวนตอนมากสุด" },
];

const FILTER_LABELS: Record<string, Record<string, string>> = {
  status: { ongoing: "กำลังแปล", completed: "จบแล้ว", hiatus: "พักการแปล" },
  chapters: { "under-50": "น้อยกว่า 50 ตอน", "50-200": "50–200 ตอน", "200-500": "200–500 ตอน", "500+": "500 ตอนขึ้นไป" },
  rating: { "4.5": "คะแนน 4.5+", "4": "คะแนน 4.0+", "3.5": "คะแนน 3.5+" },
  updated: { today: "อัปเดตวันนี้", "7d": "อัปเดตใน 7 วัน", "30d": "อัปเดตใน 30 วัน" },
  content: { free: "ฟรีทั้งเรื่อง", paid: "มีตอนจำกัดการเข้าถึง" },
};

function visiblePageNumbers(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const values = new Set([1, total, current - 2, current - 1, current, current + 1, current + 2]);
  return [...values].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
}

export function NovelBrowser({
  query,
  pagination,
  facets,
  results,
  emptySuggestions,
  hasResults,
  hasSuggestions,
  title = "นิยายทั้งหมด",
  description,
  basePath = "/novels",
  fixedGenre,
  fixedTag,
  headingLevel = "h1",
}: {
  query: NovelQuery;
  pagination: { page: number; total: number; totalPages: number };
  facets: GenreFacet[];
  results: ReactNode;
  emptySuggestions: ReactNode;
  hasResults: boolean;
  hasSuggestions: boolean;
  title?: string;
  description?: string;
  basePath?: string;
  fixedGenre?: string;
  fixedTag?: string;
  headingLevel?: "h1" | "h2";
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const selectedGenres = parseGenreParam(query.genre);
  const visibleGenres = selectedGenres.filter((slug) => slug !== fixedGenre);
  const activeGenreSlugs = facets.map((genre) => genre.slug);
  const genreLabels = new Map(facets.map((genre) => [genre.slug, genre.thaiName]));
  const hasFilters = visibleGenres.length > 0 || Boolean((query.tag && query.tag !== fixedTag) || query.status || query.chapters || query.rating || query.updated || query.content || query.q);

  function routeHref(next: NovelQuery) {
    const visibleQuery = { ...next };
    if (fixedGenre) delete visibleQuery.genre;
    if (fixedTag) delete visibleQuery.tag;
    const canonical = novelBrowseHref(visibleQuery, activeGenreSlugs);
    return `${basePath}${canonical.slice("/novels".length)}`;
  }

  function update(next: NovelQuery) {
    startTransition(() => router.replace(routeHref({ ...next, page: undefined }), { scroll: false }));
  }

  function clearAll() {
    update({ ...(fixedGenre ? { genre: fixedGenre } : {}), ...(fixedTag ? { tag: fixedTag } : {}) });
  }

  useEffect(() => {
    if (!sheetOpen) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>("button, select, input, [href]")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setSheetOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      trigger?.focus();
    };
  }, [sheetOpen]);

  const activeChips = [
    ...(query.q ? [{ key: "query", label: `ค้นหา: ${query.q}`, remove: () => update({ ...query, q: undefined, page: undefined }) }] : []),
    ...(query.tag && query.tag !== fixedTag ? [{ key: "tag", label: `แท็ก: ${query.tag}`, remove: () => update({ ...query, tag: undefined, page: undefined }) }] : []),
    ...visibleGenres.map((slug) => ({
      key: `genre-${slug}`,
      label: genreLabels.get(slug) ?? slug,
      remove: () => {
        const next = selectedGenres.filter((item) => item !== slug);
        update({ ...query, genre: next.length ? next.join(",") : fixedGenre, page: undefined });
      },
    })),
    ...(["status", "chapters", "rating", "updated", "content"] as const)
      .filter((key) => query[key])
      .map((key) => ({
        key,
        label: FILTER_LABELS[key]?.[String(query[key])] ?? String(query[key]),
        remove: () => update({ ...query, [key]: undefined, page: undefined }),
      })),
  ];
  const pages = visiblePageNumbers(pagination.page, pagination.totalPages);
  const Heading = headingLevel;

  return (
    <section className="min-w-0 space-y-6">
      <div className="border-y border-border py-5 sm:py-6">
        <p className="editorial-kicker">สำรวจคลังนิยาย</p>
        <div className="mt-1 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="min-w-0">
            <Heading className="text-h1 font-semibold sm:text-display">{title}</Heading>
            <p className="tabular mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {description ?? `${pagination.total.toLocaleString("th-TH")} เรื่อง${hasFilters ? " ที่ตรงกับตัวกรอง" : " ในคลัง"}`}
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(132px,168px)] gap-2 sm:flex sm:items-center">
            <button
              ref={triggerRef}
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              aria-controls="browse-filter-dialog"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] border border-border bg-card px-3 text-sm font-semibold hover:bg-muted sm:w-auto"
            >
              <SlidersHorizontal className="h-4 w-4" /> ตัวกรอง
              {activeChips.length ? <span className="tabular rounded-full bg-[var(--brand-primary)] px-1.5 text-[11px] text-white">{activeChips.length}</span> : null}
            </button>
            <label className="min-w-0 text-sm sm:flex sm:items-center sm:gap-2">
              <span className="sr-only sm:not-sr-only sm:text-muted-foreground">เรียงตาม</span>
              <Select value={query.sort ?? "popular"} onChange={(event) => update({ ...query, sort: event.target.value as NovelSort })} className="h-11 min-w-0">
                {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </Select>
            </label>
          </div>
        </div>

        {activeChips.length ? (
          <div className="rail-scroll -mx-3 mt-4 flex items-center gap-1.5 px-3 sm:mx-0 sm:flex-wrap sm:px-0">
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" onClick={chip.remove} className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-[var(--brand-primary)]/12 px-3 py-1 text-xs font-medium text-[var(--brand-emphasis)] sm:min-h-11">
                {chip.label}<X className="h-3 w-3" aria-hidden /><span className="sr-only">เอาตัวกรอง {chip.label} ออก</span>
              </button>
            ))}
            <button type="button" onClick={clearAll} className="min-h-10 shrink-0 px-2 text-xs font-semibold text-muted-foreground hover:underline sm:min-h-11">ล้างทั้งหมด</button>
          </div>
        ) : null}
      </div>

      <div className="scroll-mt-24" aria-busy={isPending} aria-live="polite">
        {isPending ? <NovelGridSkeleton count={12} /> : hasResults ? results : <EmptyResults onClear={clearAll} suggestions={emptySuggestions} hasSuggestions={hasSuggestions} />}
      </div>

      {pagination.totalPages > 1 ? (
        <nav aria-label="หน้าผลลัพธ์" className="mt-7 flex flex-wrap justify-center gap-1.5">
          {pages.map((pageNumber, index) => {
            const previous = pages[index - 1];
            return (
              <span key={pageNumber} className="contents">
                {previous && pageNumber - previous > 1 ? <span className="grid h-11 min-w-8 place-items-center text-muted-foreground" aria-hidden>…</span> : null}
                <Link href={routeHref({ ...query, page: pageNumber })} aria-current={pageNumber === pagination.page ? "page" : undefined} className={cn("tabular grid h-11 min-w-11 place-items-center rounded-[8px] border px-2 text-sm font-medium", pageNumber === pagination.page ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)]/12" : "border-border hover:bg-muted")}>{pageNumber}</Link>
              </span>
            );
          })}
        </nav>
      ) : null}

      {sheetOpen ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 h-full w-full bg-black/50" onClick={() => setSheetOpen(false)} aria-label="ปิดตัวกรอง" />
          <div id="browse-filter-dialog" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="browse-filter-title" className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[14px] bg-background p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:w-[520px] sm:rounded-[8px] sm:border sm:border-border">
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border sm:hidden" />
            <div className="mb-4 flex items-center justify-between gap-2">
              <div><h2 id="browse-filter-title" className="text-xl font-semibold">ตัวกรอง</h2><p className="text-xs text-muted-foreground">เลือกเท่าที่จำเป็นเพื่อจำกัดผลลัพธ์</p></div>
              <button type="button" onClick={() => setSheetOpen(false)} aria-label="ปิดตัวกรอง" className="grid h-11 w-11 place-items-center rounded-[8px] hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <FilterPanel query={query} genres={facets} hideGenres={Boolean(fixedGenre)} onChange={(next) => update({ ...next, ...(fixedGenre ? { genre: fixedGenre } : {}), ...(fixedTag ? { tag: fixedTag } : {}) })} />
            <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-border bg-background pt-4">
              {hasFilters ? <button type="button" onClick={clearAll} className="h-12 flex-1 rounded-[8px] border border-border text-sm font-semibold">ล้างทั้งหมด</button> : null}
              <button type="button" onClick={() => setSheetOpen(false)} className="h-12 flex-[2] rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ดูผลลัพธ์ {pagination.total.toLocaleString("th-TH")} เรื่อง</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function EmptyResults({ onClear, suggestions, hasSuggestions }: { onClear: () => void; suggestions: ReactNode; hasSuggestions: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-[8px] border border-dashed border-border p-8 text-center">
        <p className="font-semibold">ไม่พบนิยายที่ตรงกับตัวกรองนี้</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">ลองลดจำนวนตัวกรอง หรือกลับไปดูเรื่องยอดนิยมในคลัง</p>
        <button type="button" onClick={onClear} className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white">ล้างตัวกรอง</button>
      </div>
      {hasSuggestions ? <section aria-label="เรื่องยอดนิยม"><h2 className="mb-4 text-xl font-semibold">เรื่องยอดนิยมตอนนี้</h2>{suggestions}</section> : null}
    </div>
  );
}
