import { NovelCard } from "@/components/novels/novel-card";
import type { Novel } from "@/types/novel";

/** Server-rendered grid: only each card's bookmark control hydrates. */
export function NovelGrid({ novels }: { novels: Novel[] }) {
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
      {novels.map((novel) => (
        <li key={novel.slug} className="render-deferred">
          <NovelCard novel={novel} fluid />
        </li>
      ))}
    </ul>
  );
}
