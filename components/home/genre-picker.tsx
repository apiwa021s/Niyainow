import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Genre } from "@/types/novel";

export function GenrePicker({ items }: { items: { genre: Genre; covers: string[] }[] }) {
  return (
    <section aria-label="เลือกตามแนว" className="render-deferred py-2 sm:py-3">
      <div className="grid gap-4 lg:grid-cols-[220px_1fr] lg:items-start lg:gap-6">
        <div>
          <p className="editorial-kicker">เลือกตามแนวเรื่อง</p>
          <h2 className="mt-1 text-h2 font-semibold">เลือกตามแนว</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">เริ่มจากบรรยากาศที่อยากอ่าน</p>
          <Link href="/genres" className="mt-2 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)]">ดูหมวดหมู่ทั้งหมด<ArrowRight className="h-4 w-4" /></Link>
        </div>

        <ul className="rail-scroll -mx-3 flex gap-2 px-3 sm:mx-0 sm:flex-wrap sm:px-0">
          {items.map(({ genre }) => (
            <li key={genre.slug} className="shrink-0">
              <Link href={`/genre/${genre.slug}`} className="group inline-flex min-h-11 items-center gap-3 rounded-[6px] border border-border bg-card px-4 text-sm transition-colors hover:border-[var(--brand-emphasis)] hover:text-[var(--brand-emphasis)]">
                <span className="font-medium">{genre.thaiName}</span>
                <span className="tabular text-[11px] text-muted-foreground group-hover:text-[var(--brand-emphasis)]/75">{genre.count.toLocaleString("th-TH")}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
