"use client";

import { Coins, Eye, Unlock, Users } from "lucide-react";
import { useEffect, useState } from "react";

import type { StudioWork } from "@/components/studio/mock-data";
import { baht, whole } from "@/components/studio/mock-data";
import { EmptyState, StatTile } from "@/components/studio/studio-ui";
import { Skeleton } from "@/components/ui/section";

/**
 * Four tiles, never ten (spec §3). A tile only appears once there's a real
 * number behind it — a story two days old showing "0" four times reads as a
 * verdict, not a stage. If literally nothing has happened yet, one empty
 * state replaces the whole row instead of four blank cards.
 */
export function PerformanceSummary({ work }: { work: StudioWork }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setLoading(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-3 h-7 w-24" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const hasAnyData = work.reads > 0 || work.followers > 0 || work.unlocks > 0 || work.earnings > 0;
  if (!hasAnyData) {
    return (
      <EmptyState
        icon={Eye}
        title="ยังไม่มีข้อมูลผู้อ่าน"
        description="แชร์เรื่องของคุณ หรือเผยแพร่ตอนใหม่ แล้วสถิติจะเริ่มแสดงที่นี่"
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {work.reads > 0 ? (
        <StatTile icon={Eye} label="ยอดอ่าน" value={whole.format(work.reads)} unit="ครั้ง" change={work.change?.reads} />
      ) : null}
      {work.followers > 0 ? (
        <StatTile icon={Users} label="ผู้ติดตาม" value={whole.format(work.followers)} unit="คน" change={work.change?.followers} />
      ) : null}
      {work.unlocks > 0 ? (
        <StatTile icon={Unlock} label="ปลดล็อกตอน" value={whole.format(work.unlocks)} unit="ครั้ง" change={work.change?.unlocks} />
      ) : null}
      {work.earnings > 0 ? (
        <StatTile icon={Coins} label="รายได้" value={baht.format(work.earnings)} unit="บาท" change={work.change?.earnings} tone="money" />
      ) : null}
    </div>
  );
}
