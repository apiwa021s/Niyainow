import Link from "next/link";
import Image from "next/image";
import { Zap } from "lucide-react";
import type { Novel, UpdateItem } from "@/types/novel";

/**
 * อัปเดตล่าสุด (ส่วนที่ 6.3)
 * ใช้ list แนวตั้งแทน content row — ข้อมูลต่อรายการเยอะ (ชื่อตอน + เวลา)
 * และผู้อ่านสแกนหาเรื่องที่ติดตามได้เร็วกว่าการเลื่อนแนวนอน
 */
export function UpdateFeed({
  items,
  novelsBySlug,
  title,
  description,
  href,
  emptyText
}: {
  items: UpdateItem[];
  novelsBySlug: Record<string, Novel>;
  title: string;
  description?: string;
  href?: string;
  emptyText?: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold sm:text-xl">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {href ? (
          <Link href={href} prefetch className="shrink-0 rounded-[8px] px-2 py-1 text-sm font-semibold text-[var(--brand-light-on-light)] hover:bg-muted">
            ดูทั้งหมด 
          </Link>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {emptyText ?? "ยังไม่มีอัปเดต"}
        </p>
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {items.map((item, index) => {
            const novel = novelsBySlug[item.novelSlug];
            if (!novel) return null;

            return (
              <li key={`${item.novelSlug}-${item.chapter}-${index}`}>
                <Link
                  href={`/novel/${novel.slug}/chapter/${item.chapter}`}
                  prefetch
                  className="group flex items-center gap-3 rounded-[12px] border border-border bg-card p-2.5 transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--sh-2)]"
                >
                  <div className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-[8px] bg-muted">
                    <Image src={novel.cover} alt={`ปกนิยาย ${novel.thaiTitle}`} fill sizes="44px" className="object-cover" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{novel.thaiTitle}</p>
                    <p className="tabular line-clamp-1 text-xs text-muted-foreground">
                      ตอนที่ {item.chapter} · {item.chapterTitle}
                    </p>
                  </div>

                  <span className="flex shrink-0 items-center gap-1 rounded-[8px] bg-[var(--brand-pink)]/12 px-2 py-1 text-[11px] font-semibold text-[var(--brand-pink-on-light)]">
                    <Zap className="h-3 w-3" />
                    {item.time}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
