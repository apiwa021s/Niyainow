import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Star } from "lucide-react";

import { formatNumber } from "@/lib/utils";
import type { PromoBannerItem } from "@/services/novel-service";
import type { Novel } from "@/types/novel";

export function StorySpotlight({ banner, novel }: { banner?: PromoBannerItem; novel?: Novel }) {
  if (banner) {
    return (
      <SpotlightFrame image={banner.image}>
        <p className="text-xs font-semibold tracking-[.16em] text-white/85">เรื่องเด่นที่คัดสรร</p>
        <h2 className="mt-3 line-clamp-2 max-w-2xl text-balance font-serif text-3xl font-semibold leading-tight text-white sm:mt-4 sm:text-5xl">
          {banner.title}
        </h2>
        {banner.subtitle ? <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-6 text-white/90 sm:mt-4 sm:text-base sm:leading-7">{banner.subtitle}</p> : null}
        <SpotlightLink href={banner.linkUrl || "/novels"} label={banner.linkUrl ? (banner.ctaLabel || "ดูรายละเอียด") : "สำรวจนิยาย"} />
      </SpotlightFrame>
    );
  }

  if (novel) {
    const genre = novel.genreNames?.[novel.genres[0]] ?? novel.genres[0];
    return (
      <SpotlightFrame image={novel.backdrop || novel.cover}>
        <p className="text-xs font-semibold tracking-[.16em] text-white/85">เรื่องเด่นที่คัดสรร</p>
        <h2 className="mt-3 line-clamp-2 max-w-2xl text-balance font-serif text-3xl font-semibold leading-tight text-white sm:mt-4 sm:text-5xl">{novel.thaiTitle}</h2>
        {novel.title !== novel.thaiTitle ? <p className="mt-1 truncate text-sm text-white/80">{novel.title}</p> : null}
        <p className="mt-3 line-clamp-2 max-w-xl text-xs leading-6 text-white/90 sm:mt-4 sm:text-base sm:leading-7">{novel.synopsis}</p>
        <div className="tabular mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/85 sm:mt-4">
          {genre ? <span>{genre}</span> : null}
          {(novel.ratingCount ?? 0) > 0 ? (
            <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-[var(--brand-emphasis)] text-[var(--brand-emphasis)]" />{novel.rating.toFixed(1)}</span>
          ) : <span>ยังไม่มีคะแนน</span>}
          <span className="hidden sm:inline">{novel.chapters.toLocaleString("th-TH")} ตอน</span>
          <span className="hidden sm:inline">{formatNumber(novel.views)} ครั้ง</span>
        </div>
        <SpotlightLink href={`/novel/${novel.slug}`} label="เริ่มอ่าน" icon="book" />
      </SpotlightFrame>
    );
  }

  return (
    <section className="grid min-h-[288px] place-items-center overflow-hidden rounded-[8px] border border-border bg-card px-6 text-center sm:min-h-[360px]">
      <div>
        <p className="text-xs font-semibold tracking-[.16em] text-[var(--brand-emphasis)]">พื้นที่สำหรับเรื่องถัดไป</p>
        <h2 className="mt-3 font-serif text-4xl font-semibold">ค้นพบเรื่องที่อยากอ่านต่อ</h2>
        <Link href="/novels" className="mt-6 inline-flex h-12 items-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-6 font-semibold text-white">
          สำรวจนิยาย <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function SpotlightFrame({ image, children }: { image: string; children: React.ReactNode }) {
  return (
    <section className="relative -mx-4 min-h-[288px] overflow-hidden bg-[#0E0E10] sm:-mx-6 sm:min-h-[380px] lg:mx-0 lg:min-h-[440px] lg:rounded-[8px] lg:border lg:border-white/10">
      <Image src={image} alt="" fill preload sizes="(max-width: 1024px) 100vw, 1400px" className="object-cover object-center opacity-45 lg:object-[72%_center] lg:opacity-75" />
      <span aria-hidden className="absolute inset-0 bg-[#0E0E10]/60 lg:bg-[#0E0E10]/45" />
      <span aria-hidden className="absolute inset-y-0 left-0 w-full bg-[#0E0E10]/45 lg:w-[62%] lg:bg-[#0E0E10]/80" />
      <div className="relative flex min-h-[288px] max-w-3xl flex-col justify-end px-5 py-5 sm:min-h-[380px] sm:px-10 sm:py-9 lg:min-h-[440px] lg:justify-center lg:px-14 lg:py-12">{children}</div>
    </section>
  );
}

function SpotlightLink({ href, label, icon }: { href: string; label: string; icon?: "book" }) {
  const content = <>{icon === "book" ? <BookOpen className="h-4 w-4" /> : null}{label}<ArrowRight className="h-4 w-4" /></>;
  const className = "mt-4 inline-flex h-11 w-fit items-center gap-2 rounded-[8px] bg-[var(--brand-primary)] px-5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-light)] sm:mt-7 sm:h-12 sm:px-6 sm:text-base";
  return /^https?:\/\//i.test(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{content}<span className="sr-only"> (เปิดในแท็บใหม่)</span></a>
    : <Link href={href} className={className}>{content}</Link>;
}
