import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BookMarked,
  BookOpen,
  Clock3,
  Compass,
  LibraryBig,
  Search,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { TrendingTicker } from "@/components/home/trending-ticker";
import { UpdateFeed } from "@/components/home/update-feed";
import { RankingNovelCard } from "@/components/novels/novel-card";
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

const HOME_CAROUSEL_ITEM_CLASS = "w-[84px] shrink-0 sm:w-[96px] lg:w-[108px] xl:w-[118px] 2xl:w-[126px]";

const genreNameOf = (novel: Novel, slug?: string) =>
  slug ? (novel.genreNames?.[slug] ?? slug) : "";

function HomeCoverTile({ novel, priority = false }: { novel: Novel; priority?: boolean }) {
  const badge = novel.isNew ? "ใหม่" : novel.status === "completed" ? "จบ" : null;
  const genre = genreNameOf(novel, novel.genres[0]);

  return (
    <article className="group min-w-0">
      <Link href={`/novel/${novel.slug}`} className="block">
        <div className="cover-tile rounded-(--r-md)">
          <Image
            src={novel.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 84px, (max-width: 1024px) 96px, 126px"
            priority={priority}
            className="object-cover"
          />
          {badge ? (
            <span className="absolute left-1 top-1 z-20 rounded-[4px] bg-black/78 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {badge}
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 z-20 p-1.5">
            <h3 className="line-clamp-2 text-[11px] font-semibold leading-[1.35] text-white drop-shadow-sm sm:text-xs">
              {novel.thaiTitle}
            </h3>
            <p className="tabular mt-0.5 truncate text-[10px] text-white/75">
              {genre ? `${genre} · ` : ""}{novel.chapters.toLocaleString("th-TH")} ตอน
            </p>
          </div>
        </div>
      </Link>
    </article>
  );
}

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
        <div className="relative aspect-3/2 w-full sm:h-[clamp(240px,26vw,340px)] sm:aspect-auto">
          <Image src={banner.image} alt="" fill sizes="100vw" priority className="object-cover" />
          <div
            aria-hidden
            className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent sm:bg-linear-to-r sm:from-black/85 sm:via-black/55 sm:to-transparent"
          />
        </div>
        <div className="flex flex-col gap-2 p-3 sm:absolute sm:inset-y-0 sm:left-0 sm:max-w-[min(560px,72%)] sm:justify-center sm:p-5">
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

  const meta = (
    <p className="tabular flex flex-wrap items-center gap-x-2 text-sm text-(--text-secondary) sm:text-white/60">
      <span className="truncate">{novel.author}</span>
      <span aria-hidden>·</span>
      <span className="shrink-0">{novel.chapters.toLocaleString("th-TH")} ตอน</span>
      {(novel.ratingCount ?? 0) > 0 ? (
        <>
          <span aria-hidden>·</span>
          <span className="shrink-0">{novel.rating.toFixed(1)} คะแนน</span>
        </>
      ) : null}
    </p>
  );

  /*
   * Two different heroes, because the fold budget is completely different.
   *
   * Mobile gets a compact 2:3 cover beside the copy — roughly 150px total. A
   * full-bleed backdrop with the copy under it ate about two thirds of a 760px
   * screen and left one title above the fold, against the brief's floor of
   * eight (§6.2). The portrait cover is also the artwork readers recognise.
   *
   * From sm up there is width to spare, so the backdrop returns as a wide
   * banner with the copy overlaid.
   */
  return (
    <section className="overflow-hidden rounded-(--r-lg) border border-border bg-surface sm:relative">
      <div className="hidden sm:block">
        <div className="relative h-[clamp(240px,26vw,340px)] w-full">
          <Image src={novel.backdrop || novel.cover} alt="" fill sizes="100vw" priority className="object-cover" />
          <div aria-hidden className="absolute inset-0 bg-linear-to-r from-black/90 via-black/60 to-black/10" />
        </div>
        <div className="absolute inset-y-0 left-0 flex max-w-[min(600px,76%)] flex-col justify-center gap-2 p-5 lg:p-6">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-accent-base">เรื่องเด่นประจำสัปดาห์</p>
          <h2 className="line-clamp-2 text-h1 font-semibold text-white lg:text-display">{novel.thaiTitle}</h2>
          <p className="line-clamp-1 text-body text-white/75 lg:line-clamp-2">{novel.synopsis}</p>
          {meta}
          <Link
            href={`/novel/${novel.slug}`}
            className="mt-1.5 inline-flex h-11 w-fit items-center gap-2 rounded-full bg-accent-base px-5 font-semibold text-accent-on transition-colors hover:bg-accent-hover"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            เริ่มอ่าน
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 p-2.5 sm:hidden">
        <Link href={`/novel/${novel.slug}`} className="relative aspect-2/3 overflow-hidden rounded-(--r-md) bg-surface-recessed">
          <Image src={novel.cover} alt="" fill sizes="84px" priority className="object-cover" />
        </Link>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-accent-base">เรื่องเด่นประจำสัปดาห์</p>
          <h2 className="line-clamp-2 text-h2 font-semibold">{novel.thaiTitle}</h2>
          {meta}
          <Link
            href={`/novel/${novel.slug}`}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent-base px-4 text-sm font-semibold text-accent-on"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            เริ่มอ่าน
          </Link>
        </div>
      </div>
    </section>
  );
}

function ShortcutCard({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-14 items-center gap-2.5 rounded-(--r-md) border border-border bg-card p-2.5 transition-colors hover:border-accent-base hover:bg-surface-subtle"
    >
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-(--r-md) bg-accent-subtle text-accent-base"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold transition-colors group-hover:text-accent-base">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] leading-[1.35] text-(--text-secondary)">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-(--text-tertiary) transition-colors group-hover:text-accent-base" />
    </Link>
  );
}

function HomeNovelCarousel({
  title,
  novels,
  href,
  description,
  priorityCount = 0,
}: {
  title: string;
  novels: Novel[];
  href: string;
  description?: string;
  priorityCount?: number;
}) {
  if (!novels.length) return null;

  return (
    <ContentRow title={title} count={novels.length} description={description} href={href} bleed={false} className="render-deferred">
      {novels.map((novel, index) => (
        <RowItem key={novel.slug} className={HOME_CAROUSEL_ITEM_CLASS}>
          <HomeCoverTile novel={novel} priority={index < priorityCount} />
        </RowItem>
      ))}
    </ContentRow>
  );
}

function ReaderCommandCenter({ data, banners }: { data: HomeData; banners: PromoBannerItem[] }) {
  return (
    <section aria-label="ศูนย์เริ่มอ่าน" className="grid gap-3">
      <Hero novel={data.spotlightNovel} banner={banners[0]} />

      <div className="hidden min-w-0 gap-3 xl:grid">
        <nav aria-label="ทางลัดเริ่มอ่าน" className="grid min-w-0 gap-2 xl:grid-cols-4">
          <ShortcutCard
            href="/novels?sort=popular"
            label="ยอดนิยม"
            description="เรื่องที่คนอ่านกำลังเปิดมากที่สุด"
            icon={<Trophy className="h-4 w-4" />}
          />
          <ShortcutCard
            href="/updates"
            label="ตอนใหม่ล่าสุด"
            description="กลับมาเช็กจังหวะอัปเดตของคลัง"
            icon={<Clock3 className="h-4 w-4" />}
          />
          <ShortcutCard
            href="/genres"
            label="เลือกตามแนว"
            description="เริ่มจากอารมณ์หรือโลกที่อยากอ่าน"
            icon={<Compass className="h-4 w-4" />}
          />
          <ShortcutCard
            href="/search"
            label="ค้นหาแบบตรงใจ"
            description="ชื่อเรื่อง ผู้แต่ง ผู้แปล แนว หรือแท็ก"
            icon={<Search className="h-4 w-4" />}
          />
        </nav>
        <TrendingTicker novels={data.rankings.slice(0, 16)} />
        <GenreChipRail items={data.genreShowcase} />
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
    <div className="flex flex-col gap-4 lg:gap-5">
      <ReaderCommandCenter data={data} banners={banners} />

      {guestContinueSlot}
      {accountSections}

      <div className="xl:hidden">
        <TrendingTicker novels={data.rankings.slice(0, 16)} />
      </div>

      <div className="xl:hidden">
        <GenreChipRail items={data.genreShowcase} />
      </div>

      {data.updates.length ? (
        <div className="xl:hidden">
          <UpdateFeed
            title="ตอนใหม่ล่าสุด"
            description="รายการอัปเดตแบบ live feed สำหรับคนที่กลับมาเช็กทุกวัน"
            href="/updates"
            items={data.updates}
            novelsBySlug={data.novelsBySlug}
          />
        </div>
      ) : null}

      <HomeNovelCarousel
        title="ผู้อ่านให้คะแนนสูง"
        novels={data.recommended}
        href="/novels?sort=rating"
      />

      <HomeNovelCarousel
        title="มาใหม่สัปดาห์นี้"
        novels={data.newThisWeek}
        href="/novels?sort=new"
      />

      {data.rankings.length ? (
        <section className="render-deferred">
          <SectionHeader title="อันดับความนิยม 7 วัน" href="/rankings" />
          {/* Ranks read as a list, never a grid — a card hides the ordinal (brief §5.3). */}
          <div className="grid border-t border-border lg:grid-cols-2 lg:gap-x-6">
            {data.rankings.slice(0, 14).map((novel, index) => (
              <RankingNovelCard key={novel.slug} novel={novel} rank={index + 1} />
            ))}
          </div>
        </section>
      ) : null}

      <HomeNovelCarousel
        title="เรื่องจบแล้ว"
        novels={data.completed}
        href="/novels?status=completed&sort=rating"
      />

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
