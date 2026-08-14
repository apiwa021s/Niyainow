"use client";

import { cn } from "@/lib/utils";
import type { Genre } from "@/types/novel";
import {
  parseGenreParam,
  type ChapterRange,
  type ContentFilter,
  type NovelQuery,
  type RatingFilter,
  type UpdatedFilter,
} from "@/types/novel-query";

type GenreFacet = Genre & { matches: number };

const STATUS_OPTIONS = [
  { value: "all", label: "ทั้งหมด" },
  { value: "ongoing", label: "กำลังแปล" },
  { value: "completed", label: "จบแล้ว" },
  { value: "hiatus", label: "พักการแปล" }
] as const;

const CHAPTER_OPTIONS: { value: ChapterRange; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "under-50", label: "น้อยกว่า 50" },
  { value: "50-200", label: "50–200" },
  { value: "200-500", label: "200–500" },
  { value: "500+", label: "500 ขึ้นไป" }
];

const RATING_OPTIONS: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "4.5", label: "4.5 ขึ้นไป" },
  { value: "4", label: "4.0 ขึ้นไป" },
  { value: "3.5", label: "3.5 ขึ้นไป" }
];

const UPDATED_OPTIONS: { value: UpdatedFilter; label: string }[] = [
  { value: "all", label: "ทุกช่วงเวลา" },
  { value: "today", label: "วันนี้" },
  { value: "7d", label: "7 วัน" },
  { value: "30d", label: "30 วัน" }
];

const CONTENT_OPTIONS: { value: ContentFilter; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "free", label: "ฟรีทั้งเรื่อง" },
  { value: "paid", label: "มีตอนจำกัดการเข้าถึง" }
];

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">{label}</legend>
      {children}
    </fieldset>
  );
}

/** ปุ่มตัวเลือกเดี่ยว — สูง 36px แต่พื้นที่กดรวม padding ยังผ่าน 44px ตามแนวตั้งของ list */
function OptionChip({
  active,
  onClick,
  children,
  count
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-9 items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]"
          : "border-border bg-card hover:bg-muted"
      )}
    >
      {children}
      {typeof count === "number" ? <span className="tabular text-[10px] opacity-60">({count})</span> : null}
    </button>
  );
}

/**
 * ตัวกรองทั้งหมด (ส่วนที่ 6.4)
 * ใช้ทั้งใน sidebar เดสก์ท็อป และ bottom sheet มือถือ
 */
export function FilterPanel({
  query,
  genres,
  onChange
}: {
  query: NovelQuery;
  genres: GenreFacet[];
  onChange: (next: NovelQuery) => void;
}) {
  const selectedGenres = parseGenreParam(query.genre);

  const toggleGenre = (slug: string) => {
    const next = selectedGenres.includes(slug)
      ? selectedGenres.filter((item) => item !== slug)
      : [...selectedGenres, slug].slice(0, 8);
    onChange({ ...query, genre: next.length ? next.join(",") : undefined });
  };

  return (
    <div className="flex flex-col gap-5">
      <FilterGroup label="แนวนิยาย">
        <div className="flex flex-wrap gap-1.5">
          {genres.map((genre) => (
            <OptionChip
              key={genre.slug}
              active={selectedGenres.includes(genre.slug)}
              onClick={() => toggleGenre(genre.slug)}
              count={genre.matches}
            >
              {genre.thaiName}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="สถานะ">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => (
            <OptionChip
              key={option.value}
              active={(query.status ?? "all") === option.value}
              onClick={() => onChange({ ...query, status: option.value === "all" ? undefined : option.value })}
            >
              {option.label}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="จำนวนตอน">
        <div className="flex flex-wrap gap-1.5">
          {CHAPTER_OPTIONS.map((option) => (
            <OptionChip
              key={option.value}
              active={(query.chapters ?? "all") === option.value}
              onClick={() => onChange({ ...query, chapters: option.value === "all" ? undefined : option.value })}
            >
              {option.label}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="คะแนน">
        <div className="flex flex-wrap gap-1.5">
          {RATING_OPTIONS.map((option) => (
            <OptionChip
              key={option.value}
              active={(query.rating ?? "all") === option.value}
              onClick={() => onChange({ ...query, rating: option.value === "all" ? undefined : option.value })}
            >
              {option.label}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="อัปเดตล่าสุด">
        <div className="flex flex-wrap gap-1.5">
          {UPDATED_OPTIONS.map((option) => (
            <OptionChip
              key={option.value}
              active={(query.updated ?? "all") === option.value}
              onClick={() => onChange({ ...query, updated: option.value === "all" ? undefined : option.value })}
            >
              {option.label}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="ประเภทเนื้อหา">
        <div className="flex flex-wrap gap-1.5">
          {CONTENT_OPTIONS.map((option) => (
            <OptionChip
              key={option.value}
              active={(query.content ?? "all") === option.value}
              onClick={() => onChange({ ...query, content: option.value === "all" ? undefined : option.value })}
            >
              {option.label}
            </OptionChip>
          ))}
        </div>
      </FilterGroup>
    </div>
  );
}
