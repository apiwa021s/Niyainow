import { ChevronDown, ChevronUp, Eye, Heart, MoreHorizontal, Sparkles, Unlock } from "lucide-react";
import Link from "next/link";

import { ChapterStatusBadge } from "@/components/studio/dashboard/chapter-status-badge";
import type { StudioChapter } from "@/components/studio/mock-data";
import { whole } from "@/components/studio/mock-data";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ChapterReorderControls = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

function ReorderControl({ reorder, label }: { reorder: ChapterReorderControls; label: string }) {
  return (
    <div className="flex shrink-0 flex-col">
      <button
        type="button"
        onClick={reorder.onMoveUp}
        disabled={!reorder.canMoveUp}
        aria-label={`ย้าย ${label} ขึ้น`}
        className="grid h-5.5 w-8 place-items-center rounded-t-(--r-sm) text-(--text-tertiary) hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={reorder.onMoveDown}
        disabled={!reorder.canMoveDown}
        aria-label={`ย้าย ${label} ลง`}
        className="grid h-5.5 w-8 place-items-center rounded-b-(--r-sm) text-(--text-tertiary) hover:bg-muted disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Three visual moods, matched to what a writer needs to see for each state:
 * drafts sell "keep going," scheduled sells "you're set," published sells
 * the numbers. Never all pink — status color rules live in mock-data.ts.
 *
 * `reorder`, when passed, draws the up/down stack. Published rows only ever
 * receive one when "reorder mode" is on (see chapter-management.tsx) — each
 * move there is confirmed before it applies, per spec §7.
 */
export function ChapterRow({
  chapter,
  storySlug,
  reorder,
}: {
  chapter: StudioChapter;
  storySlug: string;
  reorder?: ChapterReorderControls;
}) {
  const label = `EP.${String(chapter.number).padStart(2, "0")}`;

  if (chapter.status === "draft") {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {reorder ? <ReorderControl reorder={reorder} label={label} /> : null}
          <div className="min-w-0">
            <p className="font-medium">
              <span className="tabular-nums text-(--text-tertiary)">{label}</span> · {chapter.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)">
              <ChapterStatusBadge status="draft" />
              <span className="tabular-nums">{whole.format(chapter.words)} คำ</span>
              <span>· บันทึก{chapter.updatedAt.replace(/^แก้ล่าสุด/, "")}</span>
            </p>
          </div>
        </div>
        <ButtonLink href={`/studio/works/${storySlug}/chapters/${chapter.number}/edit`} variant="primary" size="sm">
          เขียนต่อ
        </ButtonLink>
      </li>
    );
  }

  if (chapter.status === "scheduled") {
    return (
      <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          {reorder ? <ReorderControl reorder={reorder} label={label} /> : null}
          <div className="min-w-0">
            <p className="font-medium">
              <span className="tabular-nums text-(--text-tertiary)">{label}</span> · {chapter.title}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-(--text-secondary)">
              <ChapterStatusBadge status="scheduled" />
              <span>{chapter.updatedAt.replace(/^ตั้งเวลา\s*/, "")}</span>
            </p>
          </div>
        </div>
        <ButtonLink href={`/studio/works/${storySlug}/chapters/${chapter.number}/edit`} variant="outline" size="sm">
          แก้ไข
        </ButtonLink>
      </li>
    );
  }

  const isUnpublished = chapter.status === "unpublished";
  const labelPrefix = chapter.memberOnly ? "BONUS" : label;

  return (
    <li className={cn("flex flex-wrap items-center justify-between gap-3 px-5 py-4", isUnpublished && "opacity-60")}>
      <div className="flex min-w-0 items-center gap-3">
        {reorder ? <ReorderControl reorder={reorder} label={label} /> : null}
        <div className="min-w-0">
          <p className="font-medium">
            <span className="tabular-nums text-(--text-tertiary)">{labelPrefix}</span> · {chapter.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-(--text-secondary)">
            <ChapterStatusBadge status={chapter.status} />
            {chapter.memberOnly ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-accent-subtle px-2 py-0.5 text-[11px] font-semibold text-[var(--brand-emphasis)]">
                <Sparkles aria-hidden className="h-3 w-3" />
                สมาชิกเท่านั้น
              </span>
            ) : null}
            {chapter.earlyAccessNote ? (
              <span className="inline-flex items-center gap-1 text-[var(--brand-emphasis)]">
                <Sparkles aria-hidden className="h-3 w-3" />
                {chapter.earlyAccessNote}
              </span>
            ) : null}
            {chapter.publicReleaseNote ? <span>{chapter.publicReleaseNote}</span> : null}
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Eye aria-hidden className="h-3.5 w-3.5" /> {whole.format(chapter.views)}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Heart aria-hidden className="h-3.5 w-3.5" /> {whole.format(chapter.likes)}
            </span>
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Unlock aria-hidden className="h-3.5 w-3.5" /> {whole.format(chapter.unlocks)}
            </span>
            <span>{chapter.price ? `${chapter.price} Coins` : "อ่านฟรี"}</span>
            <span>{chapter.updatedAt}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {isUnpublished ? (
          <ButtonLink href={`/studio/works/${storySlug}/chapters/${chapter.number}/edit`} variant="outline" size="sm">
            เผยแพร่อีกครั้ง
          </ButtonLink>
        ) : chapter.memberOnly ? (
          <ButtonLink href={`/studio/works/${storySlug}/chapters/${chapter.number}/edit`} variant="outline" size="sm">
            แก้ไขตอน
          </ButtonLink>
        ) : (
          <>
            <Link
              href={`/studio/works/${storySlug}/chapters/${chapter.number}/analytics`}
              className="hidden text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline sm:inline"
            >
              สถิติ
            </Link>
            <Link
              href={`/studio/works/${storySlug}/chapters/${chapter.number}/edit`}
              aria-label={`ตัวเลือกเพิ่มเติม ${label}`}
              className="grid h-11 w-11 place-items-center rounded-(--r-md) text-(--text-secondary) hover:bg-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Link>
          </>
        )}
      </div>
    </li>
  );
}
