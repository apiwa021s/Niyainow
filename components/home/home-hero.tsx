import Image from "next/image";
import Link from "next/link";
import { BookOpen, Play } from "lucide-react";
import type { Novel } from "@/types/novel";

/**
 * Hero (ส่วนที่ 6.3)
 * เปลี่ยนจาก carousel เลื่อนอัตโนมัติ  hero นิ่ง เพราะส่วนที่ 11 ห้าม autoplay carousel
 * ปกสามใบเอียง -8° / 0° / +8° ลอยขึ้นลงช้า ๆ, ปิด animation เมื่อ prefers-reduced-motion
 * สูง 380px mobile / 480px desktop และห้ามเกิน 60vh
 */
export function HomeHero({ novels }: { novels: Novel[] }) {
  const covers = novels.slice(0, 3);
  const primary = covers[0];

  return (
    <section
      className="relative -mx-4 overflow-hidden bg-[image:var(--grad-hero)] px-4 text-white sm:-mx-6 sm:px-6 lg:mx-0 lg:rounded-[24px] lg:px-10"
      style={{ minHeight: "min(380px, 60vh)" }}
    >
      {/* จุดแสงเบลอเลียนแบบ "แสงพุ่ง" ในโลโก้ — opacity ≤ 12% ตามสเปก */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white opacity-[0.12] blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-[var(--brand-pink)] opacity-[0.10] blur-3xl"
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 py-12 lg:min-h-[480px] lg:grid-cols-[1.1fr_auto] lg:py-16">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-white/70">NIYAINOW</p>

          <h1 className="mt-3 text-[2rem] font-bold leading-[1.35] sm:text-[2.75rem] sm:leading-[1.25]">
            นิยายใหม่ อัปเดตไว อ่านได้ทันที
          </h1>

          <p className="mt-3 text-base leading-[1.75] text-white/80 sm:text-lg">
            ค้นหานิยายภาษาไทยและติดตามตอนใหม่จากข้อมูลที่เผยแพร่จริง
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href={primary ? `/novel/${primary.slug}` : "/novels"}
              prefetch
              className="flex h-12 items-center gap-2 rounded-[12px] bg-[image:var(--grad-primary)] px-6 text-base font-semibold shadow-[var(--sh-brand)] transition-transform duration-[var(--dur-fast)] active:translate-y-px"
            >
              <Play className="h-5 w-5 fill-current" />
              ดูเรื่องแนะนำ
            </Link>
            <Link
              href="/novels"
              prefetch
              className="flex h-12 items-center gap-2 rounded-[12px] border border-white/30 px-6 text-base font-semibold transition-colors hover:bg-white/10"
            >
              <BookOpen className="h-5 w-5" />
              เลือกดูทั้งหมด
            </Link>
          </div>

          <p className="mt-5 text-sm text-white/65">อ่านฟรีได้ทันที ไม่ต้องสมัครสมาชิก</p>
        </div>

        {/* ปก 3 ใบเหลื่อมกัน */}
        <div aria-hidden className="hidden justify-center gap-0 lg:flex">
          {covers.map((novel, index) => {
            const rotation = [-8, 0, 8][index] ?? 0;
            return (
              <div
                key={novel.slug}
                className="hero-cover relative aspect-[2/3] w-[150px] shrink-0 overflow-hidden rounded-[16px] shadow-[0_18px_48px_rgba(0,0,0,0.4)] ring-1 ring-white/15"
                style={
                  {
                    "--rot": `${rotation}deg`,
                    marginLeft: index === 0 ? 0 : -28,
                    zIndex: index === 1 ? 3 : 2 - Math.abs(index - 1),
                    animationDelay: `${index * 0.6}s`
                  } as React.CSSProperties
                }
              >
                <Image src={novel.cover} alt="" fill sizes="150px" priority={index === 1} className="object-cover" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
