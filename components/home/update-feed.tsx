import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Clock3 } from "lucide-react";

import { SectionHeader } from "@/components/ui/section-header";
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
      <SectionHeader title={title} count={visibleItems.length} href={href} />
      {description ? <p className="-mt-1.5 mb-2 line-clamp-1 text-sm text-(--text-secondary)">{description}</p> : null}

      {visibleItems.length === 0 ? (
        <p className="rounded-(--r-lg) border border-dashed border-border p-6 text-center text-sm text-(--text-secondary)">
          {emptyText ?? "ยังไม่มีอัปเดต"}
        </p>
      ) : (
        <ol className="grid gap-2 lg:grid-cols-2">
          {visibleItems.map((item, index) => {
            const novel = novelsBySlug[item.novelSlug];
            if (!novel) return null;
            return (
              <li key={`${item.novelSlug}-${item.chapter}-${index}`}>
                <Link
                  href={`/novel/${novel.slug}/chapter/${item.chapter}`}
                  className="group grid min-h-[84px] grid-cols-[48px_minmax(0,1fr)_20px] items-center gap-3 rounded-(--r-md) border border-border bg-card p-2.5 transition-colors hover:border-accent-base hover:bg-surface-subtle"
                >
                  <span className="relative aspect-2/3 w-12 overflow-hidden rounded-(--r-sm) bg-surface-recessed ring-1 ring-border">
                    <Image src={novel.cover} alt="" fill sizes="48px" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold transition-colors group-hover:text-accent-base">
                      {novel.thaiTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-(--text-secondary)">
                      ตอน {item.chapter.toLocaleString("th-TH")} · {item.chapterTitle}
                    </span>
                    <span className="tabular mt-1 flex items-center gap-1 text-xs text-(--text-tertiary)">
                      <Clock3 className="h-3.5 w-3.5" aria-hidden />
                      {item.time}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-(--text-tertiary) transition-colors group-hover:text-accent-base" aria-hidden />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
