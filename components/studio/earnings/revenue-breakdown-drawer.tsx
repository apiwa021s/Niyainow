import Link from "next/link";

import { baht, whole } from "@/components/studio/mock-data";
import type { ChapterEarnings } from "@/components/studio/mock-earnings";
import { Modal } from "@/components/ui/modal";

/**
 * Chapter earnings detail + revenue breakdown, combined into one drawer
 * (spec §18–19). A chapter without an adjustment never mentions the word —
 * showing a "รายการปรับปรุง: ฿0" row for every normal chapter would train
 * writers to distrust a number that never moves.
 */
export function RevenueBreakdownDrawer({
  chapter,
  sharePercent,
  onClose,
}: {
  chapter: ChapterEarnings | null;
  sharePercent: number;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(chapter)}
      onClose={onClose}
      title={chapter ? `EP.${chapter.number}` : ""}
      description={chapter?.title}
      size="sm"
    >
      {chapter ? (
        <div className="grid gap-5">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs text-(--text-tertiary)">ราคาตอน</dt>
              <dd className="mt-1 font-semibold tabular-nums">{chapter.priceCoins} Coins</dd>
            </div>
            <div>
              <dt className="text-xs text-(--text-tertiary)">ปลดล็อกทั้งหมด</dt>
              <dd className="mt-1 font-semibold tabular-nums">{whole.format(chapter.unlocks)}</dd>
            </div>
          </dl>

          <div className="rounded-xl bg-muted/40 p-4">
            <p className="text-xs font-semibold text-(--text-secondary)">รายละเอียดรายได้</p>
            <dl className="mt-3 grid gap-2.5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-(--text-secondary)">รายได้ที่นำมาคำนวณ</dt>
                <dd className="font-semibold tabular-nums">{baht.format(chapter.eligibleRevenue)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-(--text-secondary)">ส่วนแบ่งของคุณ</dt>
                <dd className="font-semibold tabular-nums">{sharePercent}%</dd>
              </div>
              <hr className="my-1 border-border" />
              <div className="flex items-center justify-between gap-3">
                <dt className="font-semibold">คุณได้รับ</dt>
                <dd className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {baht.format(chapter.creatorRevenueBeforeAdjustment)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-(--text-secondary)">NovelNow</dt>
                <dd className="tabular-nums text-(--text-secondary)">{baht.format(chapter.platformRevenue)}</dd>
              </div>
            </dl>

            {chapter.adjustmentMinor ? (
              <div className="mt-3 rounded-(--r-md) border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="font-semibold">รายการปรับปรุง</p>
                  <p className="font-semibold tabular-nums text-destructive">{baht.format(chapter.adjustmentMinor / 100)}</p>
                </div>
                <p className="mt-1 text-xs leading-5 text-(--text-secondary)">{chapter.adjustmentReason}</p>
              </div>
            ) : null}
          </div>

          <p className="text-lg font-semibold tabular-nums">รายได้ของคุณ · {baht.format(chapter.creatorRevenue)}</p>

          <Link
            href="/creators"
            className="text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
          >
            ส่วนแบ่งรายได้คำนวณอย่างไร?
          </Link>
        </div>
      ) : null}
    </Modal>
  );
}
