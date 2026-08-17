import { NOVEL_GRID_CLASS, NovelTile } from "@/components/novels/novel-card";
import { cn } from "@/lib/utils";
import type { Novel } from "@/types/novel";

/**
 * Server-rendered grid: only each card's bookmark control hydrates.
 *
 * Uses the same tile and the same column ramp as the home page, so a phone
 * shows three covers per row here too instead of two.
 */
export function NovelGrid({ novels, compact = false }: { novels: Novel[]; compact?: boolean }) {
  return (
    <ul className={cn(NOVEL_GRID_CLASS, compact && "gap-2")}>
      {novels.map((novel) => (
        <li key={novel.slug} className="render-deferred">
          <NovelTile novel={novel} />
        </li>
      ))}
    </ul>
  );
}
