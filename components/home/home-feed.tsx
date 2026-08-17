import Image from "next/image";
import Link from "next/link";
import { BellRing, BookMarked, LibraryBig, Play } from "lucide-react";
import type { ReactNode } from "react";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { TrendingTicker } from "@/components/home/trending-ticker";
import { UpdateFeed } from "@/components/home/update-feed";
import { NOVEL_GRID_CLASS, NovelTile, RankingNovelCard } from "@/components/novels/novel-card";
import { AccountContinueReadingCard } from "@/components/reader/guest-continue-reading";
import { SectionHeader } from "@/components/ui/section-header";
import type { NovelUpdate, PromoBannerItem } from "@/services/novel-service";
import type { HomePersonalization } from "@/services/user-service";
import type { Genre, Novel, UpdateItem } from "@/types/novel";

export type HomeData = {
  newThisWeek: Novel[];
  recommended: Novel[];
  completed: Novel[];
  rankings: Novel[];
  updates: UpdateItem[];
  genreShowcase: { genre: Genre; covers: string[] }[];
  novelsBySlug: Record<string, Novel>;
  spotlightNovel?: Novel;
};

const GRID = NOVEL_GRID_CLASS;

/**
 * Hero. One real featured novel — its own backdrop, its own synopsis, its own
 * chapter count — and a single primary action. No carousel: a rotating hero
 * costs the fold and buys nothing measurable.
 */
function Hero({ novel, banner }: { novel?: Novel; banner?: PromoBannerItem }) {
  if (!novel && !banner) return null;

  if (!novel && banner) {
    return (
      <section className="overflow-hidden rounded-(--r-lg) border border-border bg-surface sm:relative">
        <div className="relative aspect-3/2 w-full sm:aspect-16/6">
          <Image src={banner.image} alt="" fill sizes="100vw" priority className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent sm:bg-linear-to-r sm:from-black/85 sm:via-black/55 sm:to-transparent"
          />
        </div>
        <div className="flex flex-col gap-2 p-3 sm:absolute sm:inset-y-0 sm:left-0 sm:max-w-[min(560px,72%)] sm:justify-center sm:p-6">
          <h2 className="text-h2 font-semibold sm:text-h1 sm:text-white">{banner.title}</h2>
          {banner.subtitle ? (
            <p className="line-clamp-2 text-body text-(--text-secondary) sm:text-white/80">{banner.subtitle}</p>
          ) : null}
          {banner.linkUrl ? (
            <Link
              href={banner.linkUrl}
              className="mt-0.5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent-base px-5 font-semibold text-accent-on hover:bg-accent-hover sm:mt-1 sm:w-fit"
            >
              {banner.ctaLabel ?? "อ่านเลย"}
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  if (!novel) return null;

  /*
   * Mobile puts the copy *under* the artwork instead of on top of it. At 360px
   * an overlay has to fit a two-line Thai title, a meta row and a 44px button
   * inside roughly 200px of image — it either clips or forces the type below a
   * readable size. Stacking keeps the cover uncropped and the button full
   * width. From sm up there is room, so the overlay returns.
   */
  return (
    <section className="overflow-hidden rounded-(--r-lg) border border-border bg-surface sm:relative">
      <div className="relative aspect-3/2 w-full sm:aspect-16/6 lg:aspect-21/6">
        <Image src={novel.backdrop || novel.cover} alt="" fill sizes="100vw" priority className="object-cover" />
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent sm:bg-linear-to-r sm:from-black/90 sm:via-black/60 sm:to-black/10"
        />
      </div>

      <div className="flex flex-col gap-2 p-3 sm:absolute sm:inset-y-0 sm:left-0 sm:max-w-[min(600px,76%)] sm:justify-center sm:p-6 lg:p-8">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-accent-base">เรื่องเด่นประจำสัปดาห์</p>
        <h2 className="line-clamp-2 text-h2 font-semibold sm:text-h1 sm:text-white lg:text-display">
          {novel.thaiTitle}
        </h2>
        <p className="hidden line-clamp-2 text-body text-white/75 sm:block">{novel.synopsis}</p>
        <p className="tabular flex flex-wrap items-center gap-x-2 text-sm text-(--text-secondary) sm:text-white/60">
          <span>{novel.author}</span>
          <span aria-hidden>·</span>
          <span>{novel.chapters.toLocaleString("th-TH")} ตอน</span>
          {(novel.ratingCount ?? 0) > 0 ? (
            <>
              <span aria-hidden>·</span>
              <span>{novel.rating.toFixed(1)} คะแนน</span>
            </>
          ) : null}
        </p>
        <Link
          href={`/novel/${novel.slug}`}
          className="mt-0.5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent-base px-5 font-semibold text-accent-on transition-colors hover:bg-accent-hover sm:mt-1.5 sm:w-fit"
        >
          <Play className="h-4 w-4 fill-current" aria-hidden />
          เริ่มอ่าน
        </Link>
      </div>
    </section>
  );
}

/** Genre chips, straight from the taxonomy with their real novel counts. */
function GenreChipRail({ items }: { items: { genre: Genre; covers: string[] }[] }) {
  if (items.length === 0) return null;
  return (
    <nav aria-label="เลือกตามแนวนิยาย" className="rail-scroll -mx-1 flex gap-2 px-1">
      {items.map(({ genre }) => (
        <Link
          key={genre.slug}
          href={`/genre/${genre.slug}`}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 text-sm font-medium text-(--text-secondary) transition-colors hover:border-accent-base hover:text-accent-base"
        >
          {genre.thaiName || genre.name}
          <span className="tabular text-xs text-(--text-tertiary)">{genre.count.toLocaleString("th-TH")}</span>
        </Link>
      ))}
      <Link
        href="/genres"
        className="inline-flex h-9 shrink-0 items-center rounded-full border border-border bg-surface px-3.5 text-sm font-semibold text-accent-base"
      >
        ทั้งหมด
      </Link>
    </nav>
  );
}

export function HomeFeed({
  data,
  banners,
  accountSections,
  guestContinueSlot,
  signupSlot,
}: {
  data: HomeData;
  banners: PromoBannerItem[];
  accountSections?: ReactNode;
  guestContinueSlot?: ReactNode;
  signupSlot?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <Hero novel={data.spotlightNovel} banner={banners[0]} />

      <TrendingTicker novels={data.rankings.slice(0, 14)} />

      <GenreChipRail items={data.genreShowcase} />

      {guestContinueSlot}
      {accountSections}

      {data.recommended.length ? (
        <section className="render-deferred">
          <SectionHeader title="ผู้อ่านให้คะแนนสูง" count={data.recommended.length} href="/novels?sort=rating" />
          <div className={GRID}>
            {data.recommended.slice(0, 8).map((novel, index) => (
              <NovelTile key={novel.slug} novel={novel} priority={index < 3} />
            ))}
          </div>
        </section>
      ) : null}

      {data.newThisWeek.length ? (
        <section className="render-deferred">
          <SectionHeader title="มาใหม่สัปดาห์นี้" count={data.newThisWeek.length} href="/novels?sort=new" />
          <div className={GRID}>
            {data.newThisWeek.slice(0, 8).map((novel) => (
              <NovelTile key={novel.slug} novel={novel} />
            ))}
          </div>
        </section>
      ) : null}

      {data.rankings.length ? (
        <section className="render-deferred">
          <SectionHeader title="อันดับความนิยม 7 วัน" href="/rankings" />
          {/* Ranks read as a list, never a grid — a card hides the ordinal (brief §5.3). */}
          <div className="grid border-t border-border lg:grid-cols-2 lg:gap-x-6">
            {data.rankings.slice(0, 10).map((novel, index) => (
              <RankingNovelCard key={novel.slug} novel={novel} rank={index + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {data.updates.length ? (
        <UpdateFeed
          title="อัปเดตล่าสุด"
          description="ตอนใหม่จากเรื่องที่เพิ่งเผยแพร่"
          href="/updates"
          items={data.updates}
          novelsBySlug={data.novelsBySlug}
        />
      ) : null}

      {data.completed.length ? (
        <section className="render-deferred">
          <SectionHeader
            title="เรื่องจบแล้ว"
            count={data.completed.length}
            href="/novels?status=completed&sort=rating"
          />
          <div className={GRID}>
            {data.completed.slice(0, 8).map((novel) => (
              <NovelTile key={novel.slug} novel={novel} />
            ))}
          </div>
        </section>
      ) : null}

      {signupSlot}
    </div>
  );
}

export function HomePersonalizedSections({
  personalization,
  followedUpdates,
}: {
  personalization: HomePersonalization;
  followedUpdates: NovelUpdate[];
}) {
  const continueItems = personalization.continueReading.slice(0, 5);
  const novelsBySlug = Object.fromEntries(followedUpdates.map((item) => [item.novel.slug, item.novel]));
  if (!continueItems.length && !personalization.followedNovelSlugs.length) return null;

  return (
    <>
      {continueItems.length ? (
        <ContentRow title="อ่านต่อ" description="กลับสู่ตอนล่าสุดที่บันทึกไว้ในบัญชี" href="/library">
          {continueItems.map((item) => (
            <RowItem key={item.novel.slug}>
              <AccountContinueReadingCard item={item} />
            </RowItem>
          ))}
        </ContentRow>
      ) : null}

      <UpdateFeed
        title="ตอนใหม่จากเรื่องที่ติดตาม"
        description="อัปเดตจากรายการติดตามของคุณ"
        href="/library/following"
        items={followedUpdates.slice(0, 6)}
        novelsBySlug={novelsBySlug}
        emptyText={
          personalization.followedNovelSlugs.length
            ? "เรื่องที่ติดตามยังไม่มีตอนใหม่"
            : "กดติดตามนิยาย แล้วตอนใหม่จะปรากฏตรงนี้"
        }
      />
    </>
  );
}

export function HomeSignup() {
  return (
    <section className="render-deferred grid gap-4 rounded-(--r-lg) border border-border bg-surface p-4 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <h2 className="text-h2 font-semibold">เข้าสู่ระบบฟรี แล้วอ่านต่อได้ทุกอุปกรณ์</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {[
            { icon: BookMarked, title: "บันทึกตำแหน่งอ่าน" },
            { icon: BellRing, title: "ติดตามตอนใหม่" },
            { icon: LibraryBig, title: "จัดชั้นหนังสือส่วนตัว" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="flex items-center gap-2 text-body text-(--text-secondary)">
                <Icon className="h-4 w-4 text-accent-base" />
                {item.title}
              </li>
            );
          })}
        </ul>
      </div>
      <Link
        href="/login"
        className="inline-flex h-11 items-center justify-center rounded-full bg-accent-base px-6 font-semibold text-accent-on hover:bg-accent-hover"
      >
        เข้าสู่ระบบด้วย Google
      </Link>
    </section>
  );
}
