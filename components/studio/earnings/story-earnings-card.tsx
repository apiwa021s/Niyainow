import { ArrowDownRight, ArrowUpRight, BookMarked } from "lucide-react";
import Link from "next/link";

import { baht, whole } from "@/components/studio/mock-data";
import type { StoryEarnings } from "@/components/studio/mock-earnings";
import { cn } from "@/lib/utils";

export function StoryEarningsCard({ story }: { story: StoryEarnings }) {
  const up = story.change >= 0;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;

  return (
    <Link
      href={`/studio/works/${story.slug}/earnings`}
      className="flex items-center gap-3 px-5 py-4 transition-colors duration-[var(--dur-fast)] hover:bg-muted/60"
    >
      <span aria-hidden className="grid h-14 w-10 shrink-0 place-items-center rounded-[6px] bg-accent-subtle text-brand-primary">
        <BookMarked className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{story.title}</p>
        <p className="mt-0.5 text-xs text-(--text-tertiary) tabular-nums">ปลดล็อก {whole.format(story.unlocks)} ครั้ง</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="font-semibold tabular-nums">{baht.format(story.earnings)}</p>
        <p className={cn("mt-0.5 inline-flex items-center gap-0.5 text-xs font-semibold", up ? "text-emerald-500" : "text-(--text-tertiary)")}>
          <Arrow aria-hidden className="h-3 w-3" />
          {up ? "+" : ""}
          {story.change.toFixed(1)}%
        </p>
      </div>
    </Link>
  );
}
