"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { FilterPanel } from "@/components/browse/filter-panel";
import { NovelCard } from "@/components/novels/novel-card";
import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";
import { Select } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";
import {
  getGenreFacets,
  getNovels,
  getRankings,
  parseGenreParam,
  type NovelQuery,
  type NovelSort
} from "@/services/novel-service";
import { genres as allGenres } from "@/data/mock-data";

const PAGE_SIZE = 18;

const SORT_OPTIONS: { value: NovelSort; label: string }[] = [
  { value: "popular", label: "ยอดนิยม" },
  { value: "updated", label: "อัปเดตล่าสุด" },
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "new", label: "มาใหม่" },
  { value: "chapters", label: "จำนวนตอนมากสุด" }
];

/** ป้ายกำกับของ chip ตัวกรองที่เลือกอยู่ */
const FILTER_LABELS: Record<string, Record<string, string>> = {
  status: { ongoing: "กำลังแปล", completed: "จบแล้ว", hiatus: "พักการแปล" },
  chapters: { "under-50": "น้อยกว่า 50 ตอน", "50-200": "50–200 ตอน", "200-500": "200–500 ตอน", "500+": "500 ตอนขึ้นไป" },
  rating: { "4.5": "คะแนน 4.5+", "4": "คะแนน 4.0+", "3.5": "คะแนน 3.5+" },
  updated: { today: "อัปเดตวันนี้", "7d": "อัปเดตใน 7 วัน", "30d": "อัปเดตใน 30 วัน" },
  content: { free: "ฟรีทั้งเรื่อง", paid: "มีตอนเหรียญ" }
};

export function NovelBrowser({
  initialQuery = {},
  initialPage = 1,
  title = "นิยายทั้งหมด"
}: {
  initialQuery?: NovelQuery;
  initialPage?: number;
  title?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState<NovelQuery>(initialQuery);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const results = useMemo(() => getNovels(query), [query]);
  const facets = useMemo(() => getGenreFacets(query), [query]);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));

  // ?page=N ต้องแสดงผลของหน้านั้นจริง ไม่งั้นลิงก์แบ่งหน้าที่ทำไว้เพื่อ SEO
  // จะพาบอตไปเจอเนื้อหาหน้าแรกซ้ำทุกหน้า
  const currentPage = Math.min(initialPage, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;
  const visible = results.slice(offset, offset + visibleCount);

  const selectedGenres = parseGenreParam(query.genre);
  const hasFilters =
    selectedGenres.length > 0 || Boolean(query.status || query.chapters || query.rating || query.updated || query.content);

  function update(next: NovelQuery) {
    setQuery(next);
    setVisibleCount(PAGE_SIZE);

    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, String(value));
    });

    // sync กับ URL เพื่อแชร์ลิงก์ได้ + SEO (ส่วนที่ 6.4)
    startTransition(() => {
      router.replace(params.size ? `/novels?${params.toString()}` : "/novels", { scroll: false });
    });
  }

  const clearAll = () => update({ q: query.q });

  /** chip ของตัวกรองที่เลือกอยู่ กดกากบาทเพื่อเอาออกทีละอัน */
  const activeChips = [
    ...selectedGenres.map((slug) => ({
      key: `genre-${slug}`,
      label: allGenres.find((genre) => genre.slug === slug)?.thaiName ?? slug,
      remove: () => {
        const next = selectedGenres.filter((item) => item !== slug);
        update({ ...query, genre: next.length ? next.join(",") : undefined });
      }
    })),
    ...(["status", "chapters", "rating", "updated", "content"] as const)
      .filter((key) => query[key])
      .map((key) => ({
        key,
        label: FILTER_LABELS[key]?.[String(query[key])] ?? String(query[key]),
        remove: () => update({ ...query, [key]: undefined })
      }))
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* ---------------- Sidebar (desktop) ---------------- */}
      <aside className="hidden lg:block">
        <div className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto rounded-[16px] border border-border bg-card p-4">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="font-semibold">ตัวกรอง</h2>
            {hasFilters ? (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-[var(--brand-light-on-light)] hover:underline">
                ล้างทั้งหมด
              </button>
            ) : null}
          </div>
          <FilterPanel query={query} genres={facets} onChange={update} />
        </div>
      </aside>

      {/* ---------------- ผลลัพธ์ ---------------- */}
      <section className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
            <p className="tabular mt-1 text-sm text-muted-foreground">
              {results.length.toLocaleString("th-TH")} เรื่อง
              {hasFilters ? " ที่ตรงกับตัวกรอง" : ""}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <span className="shrink-0 text-muted-foreground">เรียงตาม</span>
            <Select
              value={query.sort ?? "popular"}
              onChange={(event) => update({ ...query, sort: event.target.value as NovelSort })}
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

        {/* แถว chip ตัวกรองที่เลือกอยู่ */}
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

        {/* Grid: mobile 2 / tablet 4 / desktop 6, gap 16px (ส่วนที่ 6.4) */}
        <div className="mt-5" aria-busy={isPending}>
          {isPending ? (
            <NovelGridSkeleton count={12} />
          ) : visible.length > 0 ? (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
              {visible.map((novel) => (
                <li key={novel.slug}>
                  <NovelCard novel={novel} fluid />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyResults onClear={clearAll} />
          )}
        </div>

        {/* โหลดเพิ่ม — ไม่ใช้ infinite scroll ล้วน เพื่อให้เข้าถึง footer ได้ (ส่วนที่ 6.4) */}
        {!isPending && offset + visibleCount < results.length ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}
              className="flex h-12 items-center rounded-[12px] border border-border bg-card px-6 text-sm font-semibold hover:bg-muted"
            >
              โหลดเพิ่ม (เหลืออีก {(results.length - offset - visibleCount).toLocaleString("th-TH")} เรื่อง)
            </button>
          </div>
        ) : null}

        {/* เลขหน้าเพื่อ SEO — ให้บอตไต่ไปหน้าถัดไปได้ แม้ผู้ใช้จะกด "โหลดเพิ่ม" */}
        {totalPages > 1 ? (
          <nav aria-label="แบ่งหน้า" className="mt-6 flex flex-wrap justify-center gap-1.5">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => {
              const params = new URLSearchParams();
              Object.entries(query).forEach(([key, value]) => {
                if (value && value !== "all") params.set(key, String(value));
              });
              if (pageNumber > 1) params.set("page", String(pageNumber));

              return (
                <Link
                  key={pageNumber}
                  href={params.size ? `/novels?${params.toString()}` : "/novels"}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                  className={cn(
                    "tabular grid h-10 min-w-10 place-items-center rounded-[8px] border px-2 text-sm font-medium",
                    pageNumber === currentPage
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {pageNumber}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </section>

      {/* ---------------- ปุ่มตัวกรองลอย + bottom sheet (mobile) ---------------- */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 left-1/2 z-40 flex h-12 -translate-x-1/2 items-center gap-2 rounded-full bg-[image:var(--grad-primary)] px-5 text-sm font-semibold text-white shadow-[var(--sh-brand)] lg:hidden"
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
            className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[24px] bg-background p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
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

            <FilterPanel query={query} genres={facets} onChange={update} />

            <button
              type="button"
              onClick={() => setSheetOpen(false)}
              className="mt-6 grid h-12 w-full place-items-center rounded-[12px] bg-[image:var(--grad-primary)] text-sm font-semibold text-white"
            >
              ดูผลลัพธ์ {results.length.toLocaleString("th-TH")} เรื่อง
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Empty state — ต้องเสนอทางไปต่อเสมอ (ส่วนที่ 4 ข้อ 3, ส่วนที่ 6.4) */
function EmptyResults({ onClear }: { onClear: () => void }) {
  const suggestions = getRankings().slice(0, 6);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-[16px] border border-dashed border-border p-8 text-center">
        <p className="text-base font-semibold">ไม่พบนิยายที่ตรงกับตัวกรองนี้</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          ลองเอาตัวกรองบางอันออก หรือเริ่มใหม่จากเรื่องยอดนิยมด้านล่าง
        </p>
        <button
          type="button"
          onClick={onClear}
          className="mt-4 inline-flex h-11 items-center rounded-[12px] bg-[image:var(--grad-primary)] px-5 text-sm font-semibold text-white shadow-[var(--sh-brand)]"
        >
          ล้างตัวกรอง
        </button>
      </div>

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
    </div>
  );
}
