import { DiscoveryNovelCard } from "@/components/novels/novel-card";
import type { Novel } from "@/types/novel";

/** Server-rendered grid: only each card's bookmark control hydrates. */
export function NovelGrid({ novels, compact = false }: { novels: Novel[]; compact?: boolean }) {
  return (
    <ul className={compact ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" : "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"}>
      {novels.map((novel) => (
        <li key={novel.slug} className="render-deferred">
          <DiscoveryNovelCard novel={novel} fluid />
        </li>
      ))}
    </ul>
  );
}
