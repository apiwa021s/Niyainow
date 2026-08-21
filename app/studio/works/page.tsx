import type { Metadata } from "next";
import { BookMarked, FileText, Plus, Unlock, Users } from "lucide-react";

import { baht, studioReviewHours, studioWorks, whole, workStatusLabels } from "@/components/studio/mock-data";
import { StatusPill, StudioPageHeader, StudioRowLink, reviewWaitLabel } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "ผลงานของฉัน" };

const filters = [
  { label: "ทั้งหมด", count: studioWorks.length, active: true },
  { label: "เผยแพร่แล้ว", count: studioWorks.filter((work) => work.status === "published").length, active: false },
  { label: "รอตรวจ", count: studioWorks.filter((work) => work.status === "review").length, active: false },
  { label: "ฉบับร่าง", count: studioWorks.filter((work) => work.status === "draft").length, active: false },
];

export default function StudioWorksPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow="MY WORKS"
        title="ผลงานของฉัน"
        description="จัดการเรื่องทั้งหมดของคุณ ทั้งที่เผยแพร่แล้ว รอตรวจ และที่ยังเป็นฉบับร่าง"
        action={
          <ButtonLink href="/studio/works/new" variant="primary">
            <Plus aria-hidden className="h-4 w-4" />
            เพิ่มผลงานใหม่
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap gap-2">
        {filters.map((filter) => (
          <button
            key={filter.label}
            type="button"
            aria-pressed={filter.active}
            className={
              filter.active
                ? "tap-target inline-flex min-h-11 items-center gap-2 rounded-full border border-transparent bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white shadow-[var(--sh-brand)]"
                : "tap-target inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-(--text-secondary) hover:border-[var(--brand-emphasis)]"
            }
          >
            {filter.label}
            <span className="tabular-nums opacity-70">{filter.count}</span>
          </button>
        ))}
      </div>

      <ul className="mt-4 grid gap-3">
        {studioWorks.map((work) => {
          const status = workStatusLabels[work.status];
          return (
            <li key={work.slug} className="overflow-hidden rounded-xl border border-border bg-card">
              <StudioRowLink href={`/studio/works/${work.slug}`}>
                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="grid h-24 w-16 shrink-0 place-items-center rounded-[8px] bg-accent-subtle text-brand-primary"
                  >
                    <BookMarked className="h-6 w-6" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="min-w-0 truncate font-semibold">{work.title}</h2>
                      <StatusPill label={status.label} dot={status.dot} />
                    </div>
                    <p className="mt-1 text-xs text-(--text-tertiary)">
                      {work.status === "review"
                        ? reviewWaitLabel(studioReviewHours[work.slug])
                        : `แก้ไขล่าสุด ${work.updatedAt}`}
                    </p>

                    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-(--text-secondary)">
                      <div className="inline-flex items-center gap-1.5">
                        <FileText aria-hidden className="h-3.5 w-3.5 text-(--text-tertiary)" />
                        <dt className="sr-only">จำนวนตอน</dt>
                        <dd className="tabular-nums">
                          {whole.format(work.chapters)} ตอน
                          {work.drafts > 0 ? <span className="text-(--text-tertiary)"> · ร่าง {work.drafts}</span> : null}
                        </dd>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Unlock aria-hidden className="h-3.5 w-3.5 text-(--text-tertiary)" />
                        <dt className="sr-only">การปลดล็อกงวดนี้</dt>
                        <dd className="tabular-nums">{whole.format(work.unlocks)} ครั้ง</dd>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Users aria-hidden className="h-3.5 w-3.5 text-(--text-tertiary)" />
                        <dt className="sr-only">ผู้ติดตาม</dt>
                        <dd className="tabular-nums">{whole.format(work.followers)} คน</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-lg font-semibold tabular-nums">{baht.format(work.earnings)}</p>
                    <p className="text-xs text-(--text-tertiary)">บาทงวดนี้</p>
                  </div>
                </div>
              </StudioRowLink>
            </li>
          );
        })}
      </ul>
    </>
  );
}
