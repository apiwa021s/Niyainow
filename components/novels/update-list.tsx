import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { BrandGlyph } from "@/components/brand/brand-mark";
import { getNovelBySlug } from "@/services/novel-service";
import type { UpdateItem } from "@/types/novel";

export function UpdateList({ items, limit }: { items: UpdateItem[]; limit?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/88 shadow-[var(--shadow-soft)]">
      {(limit ? items.slice(0, limit) : items).map((item, index) => {
        const novel = getNovelBySlug(item.novelSlug);
        if (!novel) return null;
        return (
          <Link key={`${item.novelSlug}-${item.chapter}`} href={`/novel/${item.novelSlug}/chapter/${item.chapter}`} className="grid grid-cols-[48px_1fr] gap-3 border-b border-border p-2.5 transition last:border-0 hover:bg-white/5 sm:grid-cols-[52px_1fr_auto]">
            <div className="relative h-14 overflow-hidden rounded-md">
              <Image src={novel.cover} alt={novel.thaiTitle} fill sizes="56px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                {index < 3 ? <span className="inline-flex items-center gap-1 rounded-md bg-[var(--brand-accent)]/14 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--brand-accent)]"><BrandGlyph type="fast" className="h-4 w-4 rounded-[4px] border-0 bg-transparent" iconClassName="h-3 w-3" />NEW</span> : null}
                <span className="text-xs text-muted-foreground">{novel.genres[0]}</span>
              </div>
              <p className="truncate text-sm font-bold">{novel.thaiTitle}</p>
              <p className="truncate text-sm text-muted-foreground">ตอนที่ {item.chapter} · {item.chapterTitle}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:hidden"><Clock className="h-3 w-3" />{item.time}</p>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Clock className="h-4 w-4" /> {item.time}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
