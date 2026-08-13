import Link from "next/link";
import type { Genre } from "@/types/novel";

/**
 * เลือกตามแนว (ส่วนที่ 6.3)
 * การ์ดแนวแทน chip เปล่า ๆ — แสดงจำนวนเรื่อง + คำอธิบายสั้น ให้ผู้อ่านตัดสินใจได้เร็ว
 */
export function GenrePicker({ items }: { items: { genre: Genre; covers: string[] }[] }) {
  return (
    <section aria-label="เลือกตามแนว" className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold sm:text-xl">เลือกตามแนว</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">เริ่มจากแนวที่คุณชอบ แล้วค่อยขยับไปแนวใกล้เคียง</p>
        </div>
        <Link href="/genres" prefetch className="shrink-0 rounded-[8px] px-2 py-1 text-sm font-semibold text-[var(--brand-light-on-light)] hover:bg-muted">
          ทั้งหมด →
        </Link>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {items.map(({ genre, covers }) => (
          <li key={genre.slug}>
            <Link
              href={`/genre/${genre.slug}`}
              prefetch
              className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[16px] border border-border bg-card p-4 transition-shadow duration-[var(--dur-base)] hover:shadow-[var(--sh-2)]"
            >
              {/* ปกจาง ๆ เป็นพื้นหลัง ให้แต่ละแนวหน้าตาไม่เหมือนกัน */}
              <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 flex w-24 opacity-[0.14]">
                {covers.slice(0, 2).map((cover, index) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={index} src={cover} alt="" loading="lazy" className="h-full w-1/2 object-cover" />
                ))}
              </span>

              <span className="relative">
                <span className="block text-sm font-semibold">{genre.thaiName}</span>
                <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{genre.description}</span>
              </span>
              <span className="tabular relative mt-3 block text-xs font-medium text-[var(--brand-light-on-light)]">
                {genre.count.toLocaleString("th-TH")} เรื่อง
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
