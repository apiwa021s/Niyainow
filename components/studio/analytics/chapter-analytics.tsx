import { Coins, Eye, Heart, MessageCircle, Unlock, Users } from "lucide-react";

import type { StudioChapter } from "@/components/studio/mock-data";
import { baht, whole } from "@/components/studio/mock-data";

const REVENUE_SHARE = 0.7;

/** Flat metrics list, no dashboards-within-dashboards (spec §25 — V1 stays simple). */
export function ChapterAnalytics({ chapter }: { chapter: StudioChapter }) {
  const revenue = chapter.unlocks * (chapter.price ?? 0) * REVENUE_SHARE;

  const tiles = [
    { icon: Eye, label: "ยอดอ่าน", value: whole.format(chapter.views) },
    { icon: Users, label: "ผู้อ่านไม่ซ้ำ", value: whole.format(chapter.uniqueReaders) },
    { icon: Unlock, label: "ปลดล็อก", value: whole.format(chapter.unlocks) },
    { icon: Coins, label: "รายได้", value: `฿${baht.format(revenue)}` },
    { icon: Heart, label: "Likes", value: whole.format(chapter.likes) },
    { icon: MessageCircle, label: "Comments", value: whole.format(chapter.comments) },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <div key={tile.label} className="rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-(--text-secondary)">{tile.label}</span>
              <Icon aria-hidden className="h-4 w-4 shrink-0 text-brand-primary" />
            </div>
            <p className="mt-3 text-2xl font-semibold tabular-nums">{tile.value}</p>
          </div>
        );
      })}
    </div>
  );
}
