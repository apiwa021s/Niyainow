"use client";

import { CalendarClock, Coins, Eye, Flame, ListChecks, PenLine, Sparkles, Unlock, Users } from "lucide-react";
import { useState } from "react";

import { studioStarterStats, studioSummary, whole } from "@/components/studio/mock-data";
import { StatTile } from "@/components/studio/studio-ui";

/**
 * Two readings of the same dashboard.
 *
 * A writer with an audience wants the money row. A writer in their first weeks
 * has zeroes in every one of those tiles, and four zeroes read as a verdict on
 * them rather than as a stage they are passing through — so starter mode shows
 * what they control this week (streak, characters written, queue depth) and one
 * real event instead of a raw view count. The full numbers stay one click away
 * for anyone who wants them; the choice lives in memory only, by design.
 */
export function DashboardStats({ isNewCreator }: { isNewCreator: boolean }) {
  const [showAllNumbers, setShowAllNumbers] = useState(false);
  const starter = isNewCreator && !showAllNumbers;

  if (starter) {
    return (
      <section aria-label="ความคืบหน้าสัปดาห์นี้">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAllNumbers(true)}
            className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
          >
            ดูตัวเลขทั้งหมด
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile icon={Flame} label="เขียนต่อเนื่อง" value={whole.format(studioStarterStats.streakDays)} unit="วัน" />
          <StatTile
            icon={PenLine}
            label="ตัวอักษรเดือนนี้"
            value={whole.format(studioStarterStats.charactersThisMonth)}
            change={studioStarterStats.charactersChange}
            tone="money"
          />
          <StatTile
            icon={ListChecks}
            label="ตอนในคิว"
            value={whole.format(studioStarterStats.queuedChapters)}
            unit="ตอน"
            hint={`พอลงถึง ${studioStarterStats.queueCoversUntil}`}
          />
          <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-(--text-secondary)">ความคืบหน้าล่าสุด</span>
              <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-brand-primary" />
            </div>
            <p className="mt-3 text-base font-semibold leading-7">{studioStarterStats.latestMilestone}</p>
            <p className="mt-2 text-xs leading-5 text-(--text-tertiary)">คนแรกที่อ่านถึงตรงนี้ คือคนที่คุณเขียนถึงจริง ๆ</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="สถิติงวดปัจจุบัน">
      {isNewCreator ? (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAllNumbers(false)}
            className="inline-flex min-h-11 items-center text-xs font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
          >
            กลับไปมุมมองเริ่มต้น
          </button>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={Coins}
          label="รายได้งวดนี้"
          value={new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
            studioSummary.earnings,
          )}
          unit="บาท"
          change={studioSummary.earningsChange}
          tone="money"
        />
        <StatTile
          icon={Unlock}
          label="การปลดล็อก"
          value={whole.format(studioSummary.unlocks)}
          unit="ครั้ง"
          change={studioSummary.unlocksChange}
          changeNote="ยอดปลดล็อกผันผวนตามช่วงเดือนเป็นปกติ"
        />
        <StatTile
          icon={Eye}
          label="ยอดอ่าน"
          value={whole.format(studioSummary.reads)}
          unit="ครั้ง"
          change={studioSummary.readsChange}
          changeNote="ยอดอ่านผันผวนตามช่วงเดือนเป็นปกติ"
        />
        <StatTile
          icon={Users}
          label="ผู้ติดตาม"
          value={whole.format(studioSummary.followers)}
          unit="คน"
          change={studioSummary.followersChange}
          changeNote="ยอดผู้ติดตามผันผวนตามช่วงเดือนเป็นปกติ"
        />
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-(--text-tertiary)">
        <CalendarClock aria-hidden className="h-3.5 w-3.5" />
        ตัวเลขที่ใช้จ่ายจริงคือตัวเลขที่ล็อกตอนปิดงวดสิ้นเดือน
      </p>
    </section>
  );
}
