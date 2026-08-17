import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Novel, UpdateItem } from "@/types/novel";

export function UpdateFeed({
  items,
  novelsBySlug,
  title,
  description,
  href,
  emptyText,
}: {
  items: UpdateItem[];
  novelsBySlug: Record<string, Novel>;
  title: string;
  description?: string;
  href?: string;
  emptyText?: string;
}) {
  const visibleItems = items.slice(0, 12);

  return (
    <section aria-label={title}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span aria-hidden className="mt-1 h-10 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
          <div>
            <p className="editorial-kicker">ตอนใหม่ล่าสุด</p>
            <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        </div>
        {href ? <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)]">ดูทั้งหมด<ArrowRight className="h-4 w-4" /></Link> : null}
      </div>

      {visibleItems.length === 0 ? (
        <p className="rounded-[8px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{emptyText ?? "ยังไม่มีอัปเดต"}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5">
          {visibleItems.map((item, index) => {
            const novel = novelsBySlug[item.novelSlug];
            if (!novel) return null;
            return (
              <li key={`${item.novelSlug}-${item.chapter}-${index}`}>
                <article className="group">
                  <Link href={`/novel/${novel.slug}/chapter/${item.chapter}`} className="block">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-[6px] border border-border bg-muted">
                      <Image src={novel.cover} alt="" fill sizes="(max-width: 640px) 46vw, (max-width: 1024px) 23vw, 190px" className="object-cover transition-transform duration-[var(--dur-base)] group-hover:scale-[1.02]" />
                      <span className="absolute bottom-2 left-2 bg-[#0E0E10]/90 px-2 py-1 font-mono text-[10px] text-white">ตอน {item.chapter}</span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-sm font-semibold leading-[1.55] transition-colors group-hover:text-[var(--brand-emphasis)]">{novel.thaiTitle}</h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">ตอนที่ {item.chapter} · {item.chapterTitle}</p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span>{novel.status === "completed" ? "จบแล้ว" : "กำลังแปล"}</span>
                      <span className="tabular shrink-0 text-[var(--brand-emphasis)]">{item.time}</span>
                    </div>
                  </Link>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
