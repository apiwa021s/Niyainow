import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { PromoBannerItem } from "@/services/novel-service";

/**
 * แบนเนอร์โปรโมทหน้าแรก (จัดการจากหลังบ้าน)
 * ไม่ autoplay ตามสเปกส่วนที่ 11 — ใบเดียวแสดงเต็ม, หลายใบเลื่อนเองด้วยนิ้ว/scrollbar
 * และมี snap ให้หยุดตรงใบพอดี
 */
export function PromoBanners({ banners }: { banners: PromoBannerItem[] }) {
  if (!banners.length) return null;
  const single = banners.length === 1;

  return (
    <section aria-label="โปรโมชันและประกาศ" className="-mx-4 px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
      <ul
        className={
          single
            ? "grid"
            : "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]"
        }
      >
        {banners.map((banner, index) => (
          <li
            key={banner.id}
            className={single ? "" : "w-[86%] shrink-0 snap-start sm:w-[68%] lg:w-[48%]"}
          >
            <BannerCard banner={banner} priority={index === 0} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function BannerCard({ banner, priority }: { banner: PromoBannerItem; priority: boolean }) {
  const content = (
    <>
      <Image
        src={banner.image}
        alt={banner.title}
        fill
        sizes="(max-width: 1024px) 100vw, 1200px"
        priority={priority}
        className="object-cover transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-hover:scale-[1.02]"
      />
      {/* ไล่เฉดทึบด้านล่างเพื่อให้ตัวอักษรอ่านออกบนภาพทุกแบบ */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/35 to-transparent" />
      <div className="relative flex h-full flex-col justify-end gap-1 p-4 text-white sm:p-6">
        <p className="text-base font-semibold leading-snug sm:text-xl">{banner.title}</p>
        {banner.subtitle ? <p className="line-clamp-2 text-sm text-white/80">{banner.subtitle}</p> : null}
        {banner.linkUrl && banner.ctaLabel ? (
          <span className="mt-2 flex w-fit items-center gap-1.5 rounded-[10px] bg-white/15 px-3 py-1.5 text-sm font-semibold backdrop-blur transition-colors group-hover:bg-white/25">
            {banner.ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </span>
        ) : null}
      </div>
    </>
  );

  const className =
    "group relative block aspect-[16/7] w-full overflow-hidden rounded-[16px] bg-muted shadow-[var(--sh-1)] sm:aspect-[21/8]";

  if (!banner.linkUrl) return <div className={className}>{content}</div>;

  const external = banner.linkUrl.startsWith("http");
  return external ? (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {content}
    </a>
  ) : (
    <Link href={banner.linkUrl} prefetch className={className}>
      {content}
    </Link>
  );
}
