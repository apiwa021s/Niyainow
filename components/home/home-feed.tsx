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
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { ViewTransition } from "react";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { TasteDiscovery } from "@/components/home/taste-discovery";
import { TrendingTicker } from "@/components/home/trending-ticker";
import { UpdateFeed } from "@/components/home/update-feed";
import { RankingNovelCard } from "@/components/novels/novel-card";
import { AccountContinueReadingCard } from "@/components/reader/guest-continue-reading";
import { SectionHeader } from "@/components/ui/section-header";
import type { NovelUpdate, PromoBannerItem } from "@/services/novel-service";
import type { HomePersonalization } from "@/services/user-service";
import type { Genre, Novel } from "@/types/novel";

export type HomeData = {
  newThisWeek: Novel[];
  recommended: Novel[];
  completed: Novel[];
  rankings: Novel[];
  updates: NovelUpdate[];
  genreShowcase: { genre: Genre; covers: string[] }[];
};

const HOME_CAROUSEL_ITEM_CLASS = "w-[84px] shrink-0 sm:w-[96px] lg:w-[108px] xl:w-[118px]";

const genreNameOf = (novel: Novel, slug?: string) =>
  slug ? (novel.genreNames?.[slug] ?? slug) : "";

function HomeCoverTile({ novel }: { novel: Novel }) {
  const badge = novel.isNew ? "ใหม่" : novel.status === "completed" ? "จบ" : null;
  const genre = genreNameOf(novel, novel.genres[0]);

  return (
    <article className="group min-w-0">
      <Link href={`/novel/${novel.slug}`} transitionTypes={["nav-forward"]} className="block">
        <ViewTransition name={`cover-${novel.slug}`} share="morph" default="none">
        <div className="cover-tile rounded-(--r-md)">
          <Image
            src={novel.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 84px, (max-width: 1024px) 96px, (max-width: 1280px) 108px, 118px"
            className="object-cover"
          />
          {badge ? (
            <span className="absolute left-1 top-1 z-20 rounded-[4px] bg-black/78 px-1.5 py-0.5 text-xs font-semibold text-white">
              {badge}
            </span>
          ) : null}
          <div className="absolute inset-x-0 bottom-0 z-20 p-1.5">
            <h3 className="line-clamp-2 text-xs font-semibold leading-[1.35] text-white drop-shadow-sm">
              {novel.thaiTitle}
            </h3>
            <p className="tabular mt-0.5 truncate text-xs text-white/75">
              {genre ? `${genre} · ` : ""}{novel.chapters.toLocaleString("th-TH")} ตอน
            </p>
          </div>
        </div>
        </ViewTransition>
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
          <Image src={banner.image} alt="" fill sizes="100vw" preload className="object-cover" />
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
   * One responsive composition keeps the fold compact on mobile while giving
   * the cover room to lead on desktop. The same cover drives both the crisp
   * foreground artwork and the blurred colour field behind it.
   */
  return (
    <section className="relative isolate overflow-hidden rounded-(--r-lg) border border-border bg-surface">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Image
          src={novel.cover}
          alt=""
          fill
          sizes="(min-width: 1280px) calc(100vw - 364px), 100vw"
          fetchPriority="high"
          className="scale-125 object-cover object-center opacity-45 blur-3xl saturate-150 sm:opacity-65"
        />
        <div className="absolute inset-0 bg-linear-to-r from-surface/96 via-surface/92 to-surface/82 sm:from-black/92 sm:via-black/70 sm:to-black/35" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-surface/55 sm:to-black/60" />
      </div>

      <div className="relative grid grid-cols-[84px_minmax(0,1fr)] gap-3 p-2.5 sm:h-[clamp(240px,26vw,340px)] sm:grid-cols-[minmax(0,1fr)_clamp(128px,14vw,190px)] sm:items-center sm:gap-6 sm:p-5 lg:gap-8 lg:p-6">
        <Link
          href={`/novel/${novel.slug}`}
          transitionTypes={["nav-forward"]}
          className="relative aspect-2/3 overflow-hidden rounded-(--r-md) bg-surface-recessed shadow-(--sh-2) ring-1 ring-black/10 sm:order-2 sm:w-full sm:ring-white/15"
        >
          <Image
            src={novel.cover}
            alt={`ปกนิยาย ${novel.thaiTitle}`}
            fill
            sizes="(max-width: 639px) 84px, (max-width: 1023px) 150px, 190px"
            className="object-cover transition-transform duration-300 hover:scale-[1.02]"
          />
        </Link>

        <div className="flex min-w-0 flex-col gap-1 sm:order-1 sm:max-w-[650px] sm:gap-2">
          <p className="text-xs font-semibold text-accent-base">เรื่องเด่นประจำสัปดาห์</p>
          <h2 className="line-clamp-2 text-h2 font-semibold sm:text-h1 sm:text-white lg:text-display">{novel.thaiTitle}</h2>
          <p className="hidden text-body text-white/75 sm:line-clamp-2">{novel.synopsis}</p>
          {meta}
          <Link
            href={`/novel/${novel.slug}`}
            className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-full bg-accent-base px-4 text-sm font-semibold text-accent-on transition-colors hover:bg-accent-hover sm:mt-1.5 sm:h-11 sm:w-fit sm:px-5 sm:text-base"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
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
        <span className="mt-0.5 block truncate text-xs leading-[1.35] text-(--text-secondary)">{description}</span>
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
}: {
  title: string;
  novels: Novel[];
  href: string;
  description?: string;
}) {
  if (!novels.length) return null;

  return (
    <ContentRow title={title} description={description} href={href} bleed={false} className="render-deferred">
      {novels.map((novel) => (
        <RowItem key={novel.slug} className={HOME_CAROUSEL_ITEM_CLASS}>
          <HomeCoverTile novel={novel} />
        </RowItem>
      ))}
    </ContentRow>
  );
}

/**
 * The hero and its shortcuts need only the spotlight novel and the active
 * banner — a small, fast query pair — so this is fetched and streamed in on
 * its own, ahead of the six-query feed below it. See app/page.tsx.
 */
export function HomeHeroSection({ novel, banner }: { novel?: Novel; banner?: PromoBannerItem }) {
  return (
    <section aria-label="ศูนย์เริ่มอ่าน" className="grid gap-3">
      <Hero novel={novel} banner={banner} />

      <div className="hidden min-w-0 gap-3 xl:grid">
        <nav aria-label="ทางลัดเริ่มอ่าน" className="grid min-w-0 grid-cols-3 gap-2">
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
        </nav>
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
  children,
  signupSlot,
}: {
  data: HomeData;
  children?: ReactNode;
  signupSlot?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <TrendingTicker novels={data.rankings.slice(0, 16)} />
      <GenreChipRail items={data.genreShowcase} />
      <TasteDiscovery />

      {children}

      {data.updates.length ? (
        <div className="xl:hidden">
          <UpdateFeed
            title="ตอนใหม่ล่าสุด"
            description="รายการอัปเดตแบบ live feed สำหรับคนที่กลับมาเช็กทุกวัน"
            href="/updates"
            items={data.updates}
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
          <div className="grid lg:grid-cols-2 lg:gap-x-6">
            {data.rankings.slice(0, 14).map((novel, index) => (
              <RankingNovelCard key={novel.slug} novel={novel} rank={index + 1} />
            ))}
          </div>
        </section>
      ) : null}

      <HomeNovelCarousel
        title="เรื่องจบแล้ว"
        novels={data.completed}
        href="/novels?status=completed"
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
