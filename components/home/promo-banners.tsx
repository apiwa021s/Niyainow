import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PromoBannerItem } from "@/services/novel-service";

/** Secondary promotions stay static so they never compete with the main spotlight. */
export function PromoBanners({ banners }: { banners: PromoBannerItem[] }) {
  if (!banners.length) return null;
  return (
    <section aria-label="ประกาศและเรื่องคัดสรรเพิ่มเติม">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[.16em] text-[var(--brand-emphasis)]">เพิ่มเติมจากกองบรรณาธิการ</p>
          <h2 className="mt-1 font-serif text-2xl font-semibold">เรื่องและประกาศที่น่าสนใจ</h2>
        </div>
      </div>
      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {banners.map((banner) => (
          <li key={banner.id}>
            <BannerLink banner={banner} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BannerLink({ banner }: { banner: PromoBannerItem }) {
  const className = "group grid min-h-36 grid-cols-[112px_1fr] overflow-hidden rounded-[8px] border border-border bg-card transition-colors hover:border-[var(--brand-emphasis)]/45";
  const content = (
    <>
      <div className="relative min-h-36 bg-muted"><Image src={banner.image} alt="" fill sizes="112px" className="object-cover" /></div>
      <div className="flex min-w-0 flex-col justify-center p-4">
        <h3 className="line-clamp-2 font-serif font-semibold">{banner.title}</h3>
        {banner.subtitle ? <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{banner.subtitle}</p> : null}
        {banner.linkUrl ? <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-emphasis)]">{banner.ctaLabel || "ดูรายละเอียด"}<ArrowRight className="h-3.5 w-3.5" /></span> : null}
      </div>
    </>
  );
  if (!banner.linkUrl) return <article className={className}>{content}</article>;
  return /^https?:\/\//i.test(banner.linkUrl)
    ? <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={className}>{content}<span className="sr-only"> (เปิดในแท็บใหม่)</span></a>
    : <Link href={banner.linkUrl} className={className}>{content}</Link>;
}
