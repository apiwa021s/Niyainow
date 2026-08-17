"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { FilterPanel } from "@/components/browse/filter-panel";
import { Select } from "@/components/ui/form-controls";
import { novelBrowseHref } from "@/lib/validation/public-query";
import type { GenreFacet } from "@/services/novel-service";
import { parseGenreParam, type NovelQuery, type NovelSort } from "@/types/novel-query";

const SORT_OPTIONS: { value: NovelSort; label: string }[] = [
  { value: "popular", label: "ตรงคำค้นและนิยม" },
  { value: "updated", label: "อัปเดตล่าสุด" },
  { value: "rating", label: "คะแนนสูงสุด" },
  { value: "new", label: "เผยแพร่ใหม่" },
  { value: "chapters", label: "จำนวนตอนมากสุด" },
];

const LABELS: Record<string, Record<string, string>> = {
  status: { ongoing: "กำลังแปล", completed: "จบแล้ว", hiatus: "พักการแปล" },
  chapters: { "under-50": "ต่ำกว่า 50 ตอน", "50-200": "50–200 ตอน", "200-500": "200–500 ตอน", "500+": "500 ตอนขึ้นไป" },
  rating: { "4.5": "คะแนน 4.5+", "4": "คะแนน 4.0+", "3.5": "คะแนน 3.5+" },
  updated: { today: "อัปเดตวันนี้", "7d": "อัปเดตใน 7 วัน", "30d": "อัปเดตใน 30 วัน" },
  content: { free: "ฟรีทั้งเรื่อง", paid: "มีตอนจำกัดการเข้าถึง" },
};

function hasActiveFilters(query: NovelQuery) {
  return Boolean(
    query.genre
      || query.tag
      || query.status
      || query.chapters
      || query.rating
      || query.updated
      || query.content
      || (query.sort && query.sort !== "popular"),
  );
}

export function SearchNovelFilters({
  query,
  genres,
  total,
}: {
  query: NovelQuery;
  genres: GenreFacet[];
  total: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<NovelQuery>(query);
  const [pending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeGenres = genres.map((genre) => genre.slug);
  const selectedGenres = parseGenreParam(query.genre);
  const genreLabels = new Map(genres.map((genre) => [genre.slug, genre.thaiName]));

  function href(next: NovelQuery) {
    const browseHref = novelBrowseHref({ ...next, page: undefined }, activeGenres);
    return `/search${browseHref.slice("/novels".length)}`;
  }

  function update(next: NovelQuery) {
    startTransition(() => router.replace(href(next), { scroll: false }));
  }

  function clearFilters() {
    update({ q: query.q });
  }

  function openFilters(trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setDraft(query);
    setOpen(true);
  }

  function discardAndClose() {
    setDraft(query);
    setOpen(false);
  }

  function applyDraft() {
    update(draft);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>("button, select, input, [href]")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setDraft(query);
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      trigger?.focus();
    };
  }, [open, query]);

  const chips = [
    ...selectedGenres.map((slug) => ({
      key: `genre-${slug}`,
      label: genreLabels.get(slug) ?? slug,
      remove: () => {
        const next = selectedGenres.filter((genre) => genre !== slug);
        update({ ...query, genre: next.length ? next.join(",") : undefined });
      },
    })),
    ...(["status", "chapters", "rating", "updated", "content"] as const)
      .filter((key) => query[key])
      .map((key) => ({
        key,
        label: LABELS[key]?.[String(query[key])] ?? String(query[key]),
        remove: () => update({ ...query, [key]: undefined }),
      })),
  ];
  const draftHasFilters = hasActiveFilters(draft);

  return (
    <div aria-busy={pending}>
      <div className="hidden flex-wrap items-end gap-3 border-y border-border py-3 md:flex">
        <FilterSelect
          label="แนว"
          value={selectedGenres.length === 1 ? selectedGenres[0] : ""}
          onChange={(value) => update({ ...query, genre: value || undefined })}
          options={genres.map((genre) => ({ value: genre.slug, label: genre.thaiName }))}
        />
        <FilterSelect
          label="สถานะ"
          value={query.status ?? ""}
          onChange={(value) => update({ ...query, status: (value || undefined) as NovelQuery["status"] })}
          options={[
            { value: "ongoing", label: "กำลังแปล" },
            { value: "completed", label: "จบแล้ว" },
            { value: "hiatus", label: "พักการแปล" },
          ]}
        />
        <FilterSelect
          label="จำนวนตอน"
          value={query.chapters ?? ""}
          onChange={(value) => update({ ...query, chapters: (value || undefined) as NovelQuery["chapters"] })}
          options={[
            { value: "under-50", label: "ต่ำกว่า 50" },
            { value: "50-200", label: "50–200" },
            { value: "200-500", label: "200–500" },
            { value: "500+", label: "500+" },
          ]}
        />
        <FilterSelect
          label="เรียงตาม"
          value={query.sort ?? "popular"}
          onChange={(value) => update({ ...query, sort: value as NovelSort })}
          options={SORT_OPTIONS}
          includeAll={false}
        />
        <button
          type="button"
          onClick={(event) => openFilters(event.currentTarget)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls="search-filter-dialog"
          className="inline-flex h-11 items-center gap-2 rounded-[8px] border border-border px-3 text-sm font-semibold hover:bg-muted"
        >
          <SlidersHorizontal className="h-4 w-4" />ตัวกรองทั้งหมด
          {chips.length ? <span className="tabular text-xs text-[var(--brand-emphasis)]">{chips.length}</span> : null}
        </button>
      </div>

      <button
        type="button"
        onClick={(event) => openFilters(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="search-filter-dialog"
        className="flex h-12 w-full items-center justify-between rounded-[8px] border border-border px-4 text-sm font-semibold md:hidden"
      >
        <span className="inline-flex items-center gap-2"><SlidersHorizontal className="h-4 w-4" />กรองนิยาย</span>
        <span className="tabular text-xs text-muted-foreground">{total.toLocaleString("th-TH")} เรื่อง</span>
      </button>

      {chips.length ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button key={chip.key} type="button" onClick={chip.remove} className="inline-flex min-h-11 items-center gap-1 rounded-[6px] bg-[var(--brand-primary)]/10 px-3 text-xs font-medium text-[var(--brand-emphasis)]">
              {chip.label}<X className="h-3.5 w-3.5" /><span className="sr-only">นำตัวกรอง {chip.label} ออก</span>
            </button>
          ))}
          <button type="button" onClick={clearFilters} className="min-h-11 px-2 text-xs font-semibold text-muted-foreground hover:underline">ล้างตัวกรอง</button>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 h-full w-full bg-black/55" onClick={discardAndClose} aria-label="ยกเลิกและปิดตัวกรอง" />
          <div
            id="search-filter-dialog"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-filter-title"
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-[14px] bg-background p-5 pb-[calc(20px+env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:right-6 sm:top-20 sm:max-h-[calc(100vh-6rem)] sm:w-[520px] sm:rounded-[8px] sm:border sm:border-border"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><h2 id="search-filter-title" className="text-xl font-semibold">กรองผลนิยาย</h2><p className="text-xs text-muted-foreground">เลือกตัวกรองให้ครบ แล้วกดใช้ตัวกรองเพื่อดูผลใหม่</p></div>
              <button type="button" onClick={discardAndClose} aria-label="ยกเลิกและปิดตัวกรอง" className="grid h-11 w-11 place-items-center rounded-[6px] hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <FilterPanel query={draft} genres={genres} onChange={setDraft} />
            <div className="sticky bottom-0 mt-6 flex gap-2 border-t border-border bg-background pt-4">
              <button type="button" onClick={() => setDraft({ q: query.q })} disabled={!draftHasFilters} className="h-12 flex-1 rounded-[8px] border border-border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45">รีเซ็ต</button>
              <button type="button" onClick={discardAndClose} className="h-12 flex-1 rounded-[8px] border border-border text-sm font-semibold">ยกเลิก</button>
              <button type="button" onClick={applyDraft} className="h-12 flex-[1.5] rounded-[8px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ใช้ตัวกรอง</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  includeAll = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  includeAll?: boolean;
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <Select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 min-w-32 text-foreground">
        {includeAll ? <option value="">ทั้งหมด</option> : null}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </Select>
    </label>
  );
}
