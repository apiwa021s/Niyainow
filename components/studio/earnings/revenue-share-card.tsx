"use client";

import { useState } from "react";

import { contractTypeLabel, type CreatorRevenueContract } from "@/components/studio/mock-earnings";
import { Modal } from "@/components/ui/modal";

import { RevenueShareHistory } from "./revenue-share-history";

/** Current share % + tier, with the full contract history one tap away (spec §20–21). */
export function RevenueShareCard({
  current,
  history,
}: {
  current: CreatorRevenueContract;
  history: readonly CreatorRevenueContract[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <p className="text-xs font-semibold text-[var(--brand-emphasis)]">ส่วนแบ่งรายได้ของคุณ</p>
        <p className="mt-2 text-4xl font-semibold tabular-nums">{current.creatorSharePercent}%</p>
        <p className="mt-1 text-sm font-medium text-(--text-secondary)">{contractTypeLabel(current.type)}</p>
        <p className="mt-3 text-xs leading-6 text-(--text-tertiary)">
          คุณได้รับ {current.creatorSharePercent}% ของรายได้ที่เข้าเงื่อนไขการแบ่งรายได้
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="tap-target mt-4 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
        >
          ดูรายละเอียด
        </button>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="ส่วนแบ่งรายได้" size="sm">
        <div className="grid gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-accent-subtle p-4">
              <p className="text-xs text-(--text-secondary)">คุณ</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--brand-emphasis)]">{current.creatorSharePercent}%</p>
            </div>
            <div className="rounded-xl bg-muted/40 p-4">
              <p className="text-xs text-(--text-secondary)">NovelNow</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{current.platformSharePercent}%</p>
            </div>
          </div>
          <p className="text-xs text-(--text-tertiary)">มีผลตั้งแต่ {current.effectiveFromLabel}</p>
          <RevenueShareHistory history={history} />
        </div>
      </Modal>
    </>
  );
}
