"use client";

import { useState } from "react";

import type { ChapterEarnings } from "@/components/studio/mock-earnings";
import { StudioPanel } from "@/components/studio/studio-ui";

import { ChapterEarningsCard, ChapterEarningsRow } from "./chapter-earnings-row";
import { RevenueBreakdownDrawer } from "./revenue-breakdown-drawer";

/** Per-chapter earnings table/card list, opening the breakdown drawer on click (spec §17–19). */
export function ChapterEarningsList({ chapters, sharePercent }: { chapters: readonly ChapterEarnings[]; sharePercent: number }) {
  const [selected, setSelected] = useState<ChapterEarnings | null>(null);

  return (
    <StudioPanel title="รายได้แต่ละตอน" description="กดที่ตอนเพื่อดูรายละเอียดการคำนวณ">
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-160 text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-(--text-tertiary)">
              <th scope="col" className="px-5 py-3 font-medium">
                ตอน
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                ราคา
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                Unlock
              </th>
              <th scope="col" className="px-5 py-3 text-right font-medium">
                รายได้
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {chapters.map((chapter) => (
              <ChapterEarningsRow key={chapter.number} chapter={chapter} onSelect={() => setSelected(chapter)} />
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-border sm:hidden">
        {chapters.map((chapter) => (
          <li key={chapter.number}>
            <ChapterEarningsCard chapter={chapter} onSelect={() => setSelected(chapter)} />
          </li>
        ))}
      </ul>

      <RevenueBreakdownDrawer chapter={selected} sharePercent={sharePercent} onClose={() => setSelected(null)} />
    </StudioPanel>
  );
}
