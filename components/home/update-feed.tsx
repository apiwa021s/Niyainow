import Image from "next/image";
import Link from "next/link";

import { NOVEL_GRID_CLASS } from "@/components/novels/novel-card";
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
        <ul className={NOVEL_GRID_CLASS}>
          {visibleItems.map((item, index) => {
            const novel = novelsBySlug[item.novelSlug];
            if (!novel) return null;
            return (
              <li key={`${item.novelSlug}-${item.chapter}-${index}`}>
                <article className="group">
                  <Link href={`/novel/${novel.slug}/chapter/${item.chapter}`} className="block">
                    <div className="cover-tile">
                      <Image
                        src={novel.cover}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 31vw, (max-width: 1024px) 20vw, 15vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-x-0 bottom-0 z-20 p-2">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-[1.4] text-white drop-shadow-sm">
                          {novel.thaiTitle}
                        </h3>
                        <p className="tabular mt-0.5 flex items-center gap-1.5 text-xs text-white/75">
                          <span className="shrink-0">ตอน {item.chapter.toLocaleString("th-TH")}</span>
                          <span aria-hidden>·</span>
                          <span className="truncate">{item.time}</span>
                        </p>
                      </div>
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
