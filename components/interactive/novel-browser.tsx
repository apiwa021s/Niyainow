"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useState, useTransition } from "react";

import { FilterPanel } from "@/components/browse/filter-panel";
import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";
import { NovelCard } from "@/components/novels/novel-card";
import { Select } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import { novelBrowseHref } from "@/lib/validation/public-query";
import type { GenreFacet } from "@/services/novel-service";
import type { Novel, Paginated } from "@/types/novel";
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
  chapters: {
    "under-50": "น้อยกว่า 50 ตอน",
    "50-200": "50–200 ตอน",
    "200-500": "200–500 ตอน",
    "500+": "500 ตอนขึ้นไป",
  },
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
  result,
  facets,
  suggestions,
  title = "นิยายทั้งหมด",
}: {
  query: NovelQuery;
  result: Paginated<Novel>;
  facets: GenreFacet[];
  suggestions: Novel[];
  title?: string;
}) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const selectedGenres = parseGenreParam(query.genre);
  const activeGenreSlugs = facets.map((genre) => genre.slug);
  const genreLabels = new Map(facets.map((genre) => [genre.slug, genre.thaiName]));
  const hasFilters =
    selectedGenres.length > 0 ||
    Boolean(query.tag || query.status || query.chapters || query.rating || query.updated || query.content || query.q);

  function update(next: NovelQuery) {
    startTransition(() => {
      router.replace(novelBrowseHref({ ...next, page: undefined }, activeGenreSlugs), { scroll: false });
    });
  }

  const clearAll = () => update(query.q ? { q: query.q } : {});
  const activeChips = [
    ...selectedGenres.map((slug) => ({
      key: `genre-${slug}`,
      label: genreLabels.get(slug) ?? slug,
      remove: () => {
        const next = selectedGenres.filter((item) => item !== slug);
        update({ ...query, genre: next.length ? next.join(",") : undefined, page: undefined });
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
  const pages = visiblePageNumbers(result.page, result.totalPages);

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[8px] border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">ตัวกรอง</h2>
            {hasFilters ? (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-[var(--brand-light-on-light)] hover:underline">
                ล้างทั้งหมด
              </button>
            ) : null}
          </div>
          <FilterPanel query={query} genres={facets} onChange={(next) => update({ ...next, page: undefined })} />
        </div>
      </aside>

      <section className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="editorial-kicker">DISCOVER / 探す</p>
            <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h1>
            <p className="tabular mt-1 text-sm text-muted-foreground">
              {result.total.toLocaleString("th-TH")} เรื่อง{hasFilters ? " ที่ตรงกับตัวกรอง" : ""}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">เรียงตาม</span>
            <Select
              value={query.sort ?? "popular"}
              onChange={(event) => update({ ...query, sort: event.target.value as NovelSort, page: undefined })}
              className="h-10"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        {activeChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.remove}
                className="flex min-h-8 items-center gap-1 rounded-[8px] bg-[var(--brand-primary)]/12 px-2.5 py-1 text-xs font-medium text-[var(--brand-light-on-light)] hover:bg-[var(--brand-primary)]/20"
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
                <span className="sr-only">เอาตัวกรอง {chip.label} ออก</span>
              </button>
            ))}
            <button type="button" onClick={clearAll} className="ml-1 text-xs font-semibold text-muted-foreground hover:underline">
              ล้างทั้งหมด
            </button>
          </div>
        ) : null}

        <div className="mt-5" aria-busy={isPending} aria-live="polite">
          {isPending ? (
            <NovelGridSkeleton count={12} />
          ) : result.items.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
              {result.items.map((novel) => (
                <li key={novel.slug}>
                  <NovelCard novel={novel} fluid />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyResults onClear={clearAll} suggestions={suggestions} />
          )}
        </div>

        {result.totalPages > 1 ? (
          <nav aria-label="แบ่งหน้า" className="mt-6 flex flex-wrap justify-center gap-1.5">
            {pages.map((pageNumber, index) => {
              const previous = pages[index - 1];
              return (
                <span key={pageNumber} className="contents">
                  {previous && pageNumber - previous > 1 ? (
                    <span className="grid h-10 min-w-8 place-items-center text-muted-foreground" aria-hidden>…</span>
                  ) : null}
                  <Link
                    href={novelBrowseHref({ ...query, page: pageNumber }, activeGenreSlugs)}
                    aria-current={pageNumber === result.page ? "page" : undefined}
                    className={cn(
                      "tabular grid h-10 min-w-10 place-items-center rounded-[8px] border px-2 text-sm font-medium",
                      pageNumber === result.page
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {pageNumber}
                  </Link>
                </span>
              );
            })}
          </nav>
        ) : null}
      </section>

      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-[var(--sh-brand)] lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" />
        ตัวกรอง
        {activeChips.length > 0 ? (
          <span className="tabular grid h-5 min-w-5 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-[var(--brand-primary)]">
            {activeChips.length}
          </span>
        ) : null}
      </button>

      {sheetOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSheetOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="ตัวกรอง"
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[12px] bg-background p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
          >
            <div aria-hidden className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-semibold">ตัวกรอง</h2>
              {hasFilters ? (
                <button type="button" onClick={clearAll} className="text-xs font-semibold text-[var(--brand-light-on-light)]">
                  ล้างทั้งหมด
                </button>
              ) : null}
            </div>
            <FilterPanel query={query} genres={facets} onChange={(next) => update({ ...next, page: undefined })} />
            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 grid h-12 w-full place-items-center rounded-[8px] bg-[var(--brand-primary)] text-sm font-semibold text-white"
            >
              ดูผลลัพธ์ {result.total.toLocaleString("th-TH")} เรื่อง
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyResults({ onClear, suggestions }: { onClear: () => void; suggestions: Novel[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[8px] border border-dashed border-border p-8 text-center">
        <p className="text-base font-semibold">ไม่พบนิยายที่ตรงกับตัวกรองนี้</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          ลองเอาตัวกรองบางอันออก หรือเริ่มใหม่จากเรื่องยอดนิยมด้านล่าง
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex h-11 items-center rounded-[8px] bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white shadow-[var(--sh-brand)]"
        >
          ล้างตัวกรอง
        </button>
      </div>

      {suggestions.length > 0 ? (
        <section aria-label="เรื่องยอดนิยม">
          <h2 className="mb-3 text-base font-semibold">เรื่องยอดนิยมตอนนี้</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
            {suggestions.map((novel) => (
              <li key={novel.slug}>
                <NovelCard novel={novel} fluid />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
