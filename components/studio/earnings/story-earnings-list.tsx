"use client";

import { useState } from "react";

import { sortStoryEarnings, type StoryEarnings, type StoryEarningsSort } from "@/components/studio/mock-earnings";
import { StudioPanel } from "@/components/studio/studio-ui";
import { cn } from "@/lib/utils";

import { StoryEarningsCard } from "./story-earnings-card";

const SORTS: { id: StoryEarningsSort; label: string }[] = [
  { id: "earnings", label: "รายได้สูงสุด" },
  { id: "unlocks", label: "การปลดล็อกสูงสุด" },
  { id: "recent", label: "ล่าสุด" },
];

/** Sortable rollup of every story's earnings this period (spec §15). */
export function StoryEarningsList({ stories }: { stories: readonly StoryEarnings[] }) {
  const [sort, setSort] = useState<StoryEarningsSort>("earnings");
  const sorted = sortStoryEarnings(stories, sort);

  return (
    <StudioPanel
      title="รายได้จากแต่ละเรื่อง"
      action={
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="เรียงลำดับ">
          {SORTS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={sort === item.id}
              onClick={() => setSort(item.id)}
              className={cn(
                "tap-target inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors",
                sort === item.id ? "bg-muted text-(--text-primary)" : "text-(--text-tertiary) hover:text-(--text-secondary)",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      }
    >
      <ul className="divide-y divide-border">
        {sorted.map((story) => (
          <li key={story.slug}>
            <StoryEarningsCard story={story} />
          </li>
        ))}
      </ul>
    </StudioPanel>
  );
}
