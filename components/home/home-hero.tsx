import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Star } from "lucide-react";

import { formatNumber } from "@/lib/utils";
import type { Novel } from "@/types/novel";

export function HomeHero({ novels }: { novels: Novel[] }) {
  const primary = novels[0];

  if (!primary) {
    return (
      <section className="grid min-h-[420px] place-items-center overflow-hidden rounded-[8px] border border-border bg-card px-6 text-center">
        <div>
          <p className="editorial-kicker">AKANE / 物語</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold">เรื่องต่อไปของคุณ เริ่มที่นี่</h1>
          <Link href="/novels" className="mt-6 inline-flex h-12 items-center rounded-[8px] bg-[var(--brand-primary)] px-6 font-semibold text-white">สำรวจนิยาย</Link>
        </div>
      </section>
    );
  }

  const genre = primary.genreNames?.[primary.genres[0]] ?? primary.genres[0];

  return (
    <section className="relative -mx-4 min-h-[540px] overflow-hidden bg-[#0a0a0a] text-[#f5f3ef] sm:-mx-6 lg:mx-0 lg:min-h-[440px] lg:rounded-[8px] lg:border lg:border-[#292929]">
      <Image
        src={primary.backdrop || primary.cover}
        alt=""
        fill
        preload
        sizes="(max-width: 1024px) 100vw, 1400px"
        className="object-cover object-center lg:object-[72%_center]"
      />
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,10,10,.98)_0%,rgba(10,10,10,.91)_42%,rgba(10,10,10,.42)_70%,rgba(10,10,10,.12)_100%)]" />
      <span aria-hidden className="absolute inset-0 bg-[linear-gradient(0deg,rgba(10,10,10,.92)_0%,transparent_52%)] lg:hidden" />
      <span aria-hidden className="absolute right-5 top-5 hidden border-r border-[#e02028]/70 pr-3 font-serif text-xs leading-[1.8] tracking-[.35em] text-white/55 [writing-mode:vertical-rl] lg:block">静かな物語を、あなたへ</span>

      <div className="relative flex min-h-[540px] max-w-[720px] flex-col justify-end px-5 py-9 sm:px-10 lg:min-h-[440px] lg:justify-center lg:px-14 lg:py-12">
        <div className="flex items-center gap-3">
          <span className="border border-[#c91820] bg-[#c91820]/12 px-2.5 py-1 text-[11px] font-semibold text-[#ffb5b8]">เรื่องแนะนำ</span>
          <span className="editorial-kicker text-white/55">FEATURED STORY · 01</span>
        </div>

        <h1 className="mt-5 max-w-[620px] font-serif text-[2.25rem] font-semibold leading-[1.25] sm:text-[3rem] lg:text-[3.45rem]">{primary.thaiTitle}</h1>
        {primary.title !== primary.thaiTitle ? <p className="mt-1 line-clamp-1 text-sm text-white/50">{primary.title}</p> : null}
        <p className="mt-4 line-clamp-3 max-w-xl text-sm leading-[1.9] text-white/72 sm:text-base">{primary.synopsis}</p>

        <div className="tabular mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/62">
          <span>{genre}</span>
          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[#c91820] text-[#c91820]" />{primary.rating.toFixed(1)}</span>
          <span>{primary.chapters.toLocaleString("th-TH")} ตอน</span>
          <span>{formatNumber(primary.views)} ครั้ง</span>
          <span>{primary.updatedAt}</span>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link href={`/novel/${primary.slug}`} className="inline-flex h-12 items-center gap-2 rounded-[8px] bg-[#c91820] px-6 font-semibold text-white transition-colors hover:bg-[#e02028]">
            <BookOpen className="h-4.5 w-4.5" />เริ่มอ่าน
          </Link>
          <Link href={`/novel/${primary.slug}`} className="inline-flex h-12 items-center gap-2 rounded-[8px] border border-white/25 px-6 font-semibold text-white transition-colors hover:border-white/50 hover:bg-white/5">
            รายละเอียด<ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
