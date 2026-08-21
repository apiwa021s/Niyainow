import { ArrowRight, Plus, Sparkles } from "lucide-react";

import type { StudioChapter } from "@/components/studio/mock-data";
import { whole } from "@/components/studio/mock-data";
import { ButtonLink } from "@/components/ui/button";

/**
 * The most prominent thing on the dashboard after the header (spec §2) —
 * one card, one decision: keep going on a draft, or start the next one.
 * Never both at once, so there's never a question of which button matters.
 */
export function SmartActionArea({ storySlug, chapters }: { storySlug: string; chapters: readonly StudioChapter[] }) {
  const draft = chapters.find((chapter) => chapter.status === "draft");
  const latestPublished = chapters.find((chapter) => chapter.status === "published");

  if (draft) {
    const label = `EP.${String(draft.number).padStart(2, "0")}`;
    return (
      <section className="rounded-xl border border-[var(--brand-emphasis)]/30 bg-accent-subtle p-5 sm:p-6">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)]">
          <Sparkles aria-hidden className="h-4 w-4" />
          ทำต่อจากที่ค้างไว้
        </p>
        <p className="mt-3 font-semibold">
          {label} — {draft.title}
        </p>
        <p className="mt-1 text-sm text-(--text-secondary)">
          ฉบับร่าง · {whole.format(draft.words)} คำ
        </p>
        <p className="mt-1 text-xs text-(--text-tertiary)">บันทึกล่าสุด{draft.updatedAt.replace(/^แก้ล่าสุด/, "")}</p>
        <ButtonLink href={`/studio/works/${storySlug}/chapters/${draft.number}/edit`} variant="primary" className="mt-4">
          เขียนต่อ
          <ArrowRight aria-hidden className="h-4 w-4" />
        </ButtonLink>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        พร้อมสำหรับตอนต่อไปแล้ว
        <Sparkles aria-hidden className="h-4 w-4 text-brand-primary" />
      </p>
      {latestPublished ? (
        <p className="mt-2 text-sm text-(--text-secondary)">
          ตอนล่าสุด EP.{String(latestPublished.number).padStart(2, "0")} · เผยแพร่เมื่อ {latestPublished.updatedAt}
        </p>
      ) : null}
      <ButtonLink href={`/studio/works/${storySlug}/chapters/new`} variant="primary" className="mt-4">
        <Plus aria-hidden className="h-4 w-4" />
        เขียนตอนใหม่
      </ButtonLink>
    </section>
  );
}
