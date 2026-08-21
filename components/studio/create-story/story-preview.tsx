"use client";

import { BookMarked, Flame } from "lucide-react";

import type { StoryDraft } from "@/components/studio/create-story/use-story-draft";
import {
  CONTENT_WARNINGS,
  HEAT_LEVELS,
  PRIMARY_GENRES,
  RELATIONSHIP_TYPES,
  STORY_SETTINGS,
  TROPES,
  findMaster,
  labelsFor,
} from "@/lib/studio/master-data";
import { cn } from "@/lib/utils";

export function HeatBadge({ level, className }: { level: number | null; className?: string }) {
  if (!level) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-accent-subtle px-2.5 py-1 text-xs font-semibold text-[var(--brand-emphasis)]",
        className,
      )}
    >
      <Flame aria-hidden className="h-3.5 w-3.5" />
      ระดับความเข้มข้น {level}
    </span>
  );
}

/**
 * The same card the reader will meet, kept beside the form.
 *
 * Showing the result as it fills in is what turns "กรอก metadata" into "แต่ง
 * หน้าร้านของเรื่องตัวเอง" — the writer is looking at their own cover, not at a
 * form's progress bar.
 */
export function StoryPreview({ draft, compact = false }: { draft: StoryDraft; compact?: boolean }) {
  const genre = findMaster(PRIMARY_GENRES, draft.primaryGenreId);
  const secondary = labelsFor(PRIMARY_GENRES, draft.secondaryGenreIds);
  const relationship = findMaster(RELATIONSHIP_TYPES, draft.relationshipIds[0]);
  const settings = labelsFor(STORY_SETTINGS, draft.settingIds);
  const tropes = labelsFor(TROPES, draft.tropeIds);
  const warnings = labelsFor(CONTENT_WARNINGS, draft.contentWarningIds);
  const heat = HEAT_LEVELS.find((item) => item.level === draft.heatLevel);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <p className="border-b border-border px-4 py-2.5 text-xs font-semibold text-(--text-tertiary)">
        ผู้อ่านจะเห็นเรื่องของคุณแบบนี้
      </p>

      <div className="p-4">
        <div className="flex gap-3">
          <div className="grid aspect-2/3 w-20 shrink-0 place-items-center overflow-hidden rounded-[8px] bg-accent-subtle">
            {draft.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.coverUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <BookMarked aria-hidden className="h-5 w-5 text-brand-primary" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className={cn("font-semibold leading-7", !draft.title && "text-(--text-tertiary)")}>
              {draft.title || "ชื่อเรื่องของคุณ"}
            </h3>

            {genre || relationship || settings.length > 0 ? (
              <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                {genre ? <span className="font-semibold text-[var(--brand-emphasis)]">{genre.nameTh}</span> : null}
                {[...secondary, relationship?.nameEn ?? "", ...settings]
                  .filter(Boolean)
                  .map((label) => (
                    <span key={label} className="text-(--text-secondary)">
                      · {label}
                    </span>
                  ))}
              </p>
            ) : null}

            {draft.heatLevel ? <HeatBadge level={draft.heatLevel} className="mt-2" /> : null}
          </div>
        </div>

        <p className={cn("mt-3 text-sm leading-7", draft.tagline ? "text-(--text-secondary)" : "text-(--text-tertiary)")}>
          {draft.tagline || "คำโปรยสั้น ๆ ที่ทำให้คนอยากกดเข้ามาอ่าน จะขึ้นตรงนี้"}
        </p>

        {tropes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {tropes.map((label) => (
              <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-xs text-(--text-secondary)">
                {label}
              </span>
            ))}
          </div>
        ) : null}

        {!compact && warnings.length > 0 ? (
          <p className="mt-3 border-t border-border pt-3 text-xs leading-6 text-(--text-tertiary)">
            <span className="font-semibold text-(--text-secondary)">คำเตือนเนื้อหา · </span>
            {warnings.join(" · ")}
          </p>
        ) : null}

        {!compact && heat ? (
          <p className="mt-2 text-xs leading-6 text-(--text-tertiary)">
            <span className="font-semibold text-(--text-secondary)">{heat.nameTh} · </span>
            {heat.descriptionTh}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Right-hand rail for steps 2–3: what the story has become so far. */
export function StorySummaryCard({ draft }: { draft: StoryDraft }) {
  const genre = findMaster(PRIMARY_GENRES, draft.primaryGenreId);
  const rows: { label: string; values: string[] }[] = [
    { label: "แนวหลัก", values: genre ? [genre.nameTh] : [] },
    { label: "แนวรอง", values: labelsFor(PRIMARY_GENRES, draft.secondaryGenreIds) },
    { label: "คู่หลัก", values: labelsFor(RELATIONSHIP_TYPES, draft.relationshipIds) },
    { label: "โลกของเรื่อง", values: labelsFor(STORY_SETTINGS, draft.settingIds) },
    { label: "พล็อต", values: labelsFor(TROPES, draft.tropeIds) },
  ];

  const filled = rows.some((row) => row.values.length > 0) || draft.heatLevel !== null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-(--text-tertiary)">เรื่องของคุณตอนนี้</p>

      {!filled ? (
        <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
          ยังไม่ได้เลือกอะไรเลย เลือกแนวหลักก่อนหนึ่งอย่าง แล้วที่เหลือจะง่ายขึ้นเอง
        </p>
      ) : (
        <dl className="mt-3 grid gap-3">
          {rows
            .filter((row) => row.values.length > 0)
            .map((row) => (
              <div key={row.label}>
                <dt className="text-[11px] text-(--text-tertiary)">{row.label}</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {row.values.map((value) => (
                    <span key={value} className="rounded-full bg-muted px-2.5 py-1 text-xs text-(--text-secondary)">
                      {value}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          {draft.heatLevel ? (
            <div>
              <dt className="text-[11px] text-(--text-tertiary)">ความเข้มข้น</dt>
              <dd className="mt-1">
                <HeatBadge level={draft.heatLevel} />
              </dd>
            </div>
          ) : null}
        </dl>
      )}
    </div>
  );
}
