import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import type { NovelUpdate } from "@/services/novel-service";

export function UpdateList({ items, limit }: { items: NovelUpdate[]; limit?: number }) {
  const visibleItems = limit ? items.slice(0, limit) : items;
  return (
    <ol className="divide-y divide-border border-y border-border">
      {visibleItems.map((item) => {
        const genre = item.novel.genres[0];
        return (
          <li key={`${item.novelSlug}-${item.chapter}`}>
            <Link
              href={`/novel/${item.novelSlug}/chapter/${item.chapter}`}
              className="group grid min-h-24 grid-cols-[52px_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[58px_minmax(0,1fr)_auto]"
            >
              <div className="relative aspect-[2/3] w-[52px] overflow-hidden rounded-[5px] bg-muted sm:w-[58px]">
                <Image src={item.novel.cover} alt="" fill sizes="58px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold text-[var(--brand-emphasis)]">ตอนใหม่</span>
                  {genre ? <span className="text-muted-foreground">{item.novel.genreNames?.[genre] ?? genre}</span> : null}
                </div>
                <h2 className="truncate text-sm font-semibold transition-colors group-hover:text-[var(--brand-emphasis)] sm:text-base">{item.novel.thaiTitle}</h2>
                <p className="truncate text-sm text-muted-foreground">ตอนที่ {item.chapter} · {item.chapterTitle}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:hidden"><Clock className="h-3 w-3" />{item.time}</p>
              </div>
              <div className="hidden items-center gap-3 sm:flex">
                <span className="hidden items-center gap-1 text-sm text-muted-foreground sm:flex"><Clock className="h-4 w-4" />{item.time}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
