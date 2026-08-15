import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Genre } from "@/types/novel";

export function GenrePicker({ items }: { items: { genre: Genre; covers: string[] }[] }) {
  return (
    <section aria-label="เลือกตามแนว" className="border-y border-border py-8 sm:py-10">
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[280px_1fr] lg:gap-10">
        <div>
          <p className="editorial-kicker">TAXONOMY / 分類</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold sm:text-3xl">เลือกตามแนว</h2>
          <p className="mt-2 text-sm leading-[1.8] text-muted-foreground">เริ่มจากบรรยากาศที่คุณอยากอ่าน แล้วค้นพบเรื่องที่อยู่ใกล้เคียง</p>
          <Link href="/genres" prefetch className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-primary)]">ดูหมวดหมู่ทั้งหมด<ArrowRight className="h-4 w-4" /></Link>
        </div>

        <ul className="flex flex-wrap content-start gap-2.5">
          {items.map(({ genre }) => (
            <li key={genre.slug}>
              <Link href={`/genre/${genre.slug}`} prefetch className="group inline-flex min-h-11 items-center gap-3 rounded-[6px] border border-border bg-card px-4 text-sm transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]">
                <span className="font-medium">{genre.thaiName}</span>
                <span className="tabular text-[11px] text-muted-foreground group-hover:text-[var(--brand-primary)]/75">{genre.count.toLocaleString("th-TH")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
