import { ChevronRight, Rss } from "lucide-react";
import { cacheLife, cacheTag } from "next/cache";
import Image from "next/image";
import Link from "next/link";

import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { getUpdates } from "@/services/novel-service";

/**
 * Right rail (brief §5.9 / §6.2). A live column of real chapter releases —
 * cover, novel, chapter, timestamp — all read straight from the catalogue.
 * It is the widest-value use of the desktop column that would otherwise be
 * empty margin, and it never scrolls the page: it scrolls itself.
 */
export async function UpdatesRail() {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.discovery);
  cacheTag("public-chapters", "public-novels");

  const updates = await getUpdates("all", undefined, 24);
  if (updates.length === 0) return null;

  return (
    <aside
      aria-label="ตอนใหม่ล่าสุด"
      className="sticky top-0 hidden h-dvh w-[var(--rail-width)] shrink-0 flex-col bg-surface xl:flex"
    >
      <div className="flex h-[var(--topbar-h-lg)] shrink-0 items-center justify-between gap-2 px-3">
        <span className="flex items-center gap-2 text-h3 font-semibold">
          <Rss className="h-4 w-4 text-accent-base" />
          ตอนใหม่ล่าสุด
        </span>
        <Link
          href="/updates"
          className="inline-flex min-h-11 items-center gap-0.5 text-sm font-semibold text-(--text-secondary) hover:text-accent-base"
        >
          ดูทั้งหมด
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ol className="pane-scroll flex min-h-0 flex-1 flex-col gap-1 p-1.5">
        {updates.map((item) => (
          <li key={`${item.novelSlug}-${item.chapter}`}>
            <Link
              href={`/novel/${item.novelSlug}/chapter/${item.chapter}`}
              prefetch={false}
              className="group grid grid-cols-[44px_minmax(0,1fr)] items-center gap-2.5 rounded-(--r-md) px-2 py-2 transition-colors hover:bg-surface-subtle"
            >
              <div className="relative h-[66px] w-11 shrink-0 overflow-hidden rounded-(--r-sm) bg-surface-recessed ring-1 ring-border">
                <Image src={item.novel.cover} alt="" fill sizes="44px" className="object-contain" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold transition-colors group-hover:text-accent-base">
                  {item.novel.thaiTitle}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-[1.5] text-(--text-secondary)">
                  ตอน {item.chapter.toLocaleString("th-TH")} · {item.chapterTitle}
                </p>
                <p className="tabular mt-0.5 text-xs text-(--text-tertiary)">{item.time}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
