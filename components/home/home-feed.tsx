import Image from "next/image";
import Link from "next/link";
import { BellRing, BookMarked, Eye, Heart, LibraryBig } from "lucide-react";
import type { ReactNode } from "react";
import { ViewTransition } from "react";

import { BannerCarousel, type BannerSlide } from "@/components/home/banner-carousel";
import { CategoryIconRail } from "@/components/home/category-icon-rail";
import { ContentRow, RowItem } from "@/components/home/content-row";
import { RankingTabs } from "@/components/home/ranking-tabs";
import { TasteDiscovery } from "@/components/home/taste-discovery";
import { TrendingTicker } from "@/components/home/trending-ticker";
import { UpdateFeed } from "@/components/home/update-feed";
import { AccountContinueReadingCard } from "@/components/reader/guest-continue-reading";
import {
  getNovelTaste,
  type NovelTaste,
} from "@/lib/domain/reader-taste";
import { cn, formatNumber } from "@/lib/utils";
import type { NovelUpdate, PromoBannerItem } from "@/services/novel-service";
import type { HomePersonalization } from "@/services/user-service";
import type { Genre, Novel } from "@/types/novel";

export type HomeData = {
  newThisWeek: Novel[];
  recommended: Novel[];
  completed: Novel[];
  rankings: Novel[];
  rankingsDaily: Novel[];
  rankingsMonthly: Novel[];
  updates: NovelUpdate[];
  genreShowcase: { genre: Genre; covers: string[] }[];
};

const HOME_CAROUSEL_ITEM_CLASS = "w-[128px] shrink-0 sm:w-[144px] lg:w-[160px] xl:w-[172px]";

const genreNameOf = (novel: Novel, slug?: string) =>
  slug ? (novel.genreNames?.[slug] ?? slug) : "";

function HomeGridCard({ novel }: { novel: Novel }) {
  const badge = novel.isNew ? "ใหม่" : novel.status === "completed" ? "จบ" : null;
  const genre = genreNameOf(novel, novel.genres[0]);

  return (
    <article className="group min-w-0">
      <Link href={`/novel/${novel.slug}`} transitionTypes={["nav-forward"]} className="block">
        <ViewTransition name={`cover-${novel.slug}`} share="morph" default="none">
        <div className="cover-tile rounded-2xl shadow-sm">
          <Image
            src={novel.cover}
            alt=""
            fill
            sizes="(max-width: 640px) 128px, (max-width: 1024px) 144px, (max-width: 1280px) 160px, 172px"
            className="object-cover"
          />
          {badge ? (
            <span className={cn(
              "absolute left-2 top-2 z-20 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow-sm",
              badge === "ใหม่" ? "bg-linear-to-r from-rose-500 to-fuchsia-500" : "bg-emerald-600",
            )}>
              {badge}
            </span>
          ) : null}
        </div>
        </ViewTransition>
      </Link>
      <div className="mt-1.5 min-w-0">
        <Link href={`/novel/${novel.slug}`} className="block">
          <h3 className="line-clamp-2 text-sm font-semibold leading-[1.35] group-hover:text-[var(--brand-emphasis)]">
            {novel.thaiTitle}
          </h3>
        </Link>
        <p className="tabular mt-1 truncate text-xs text-(--text-tertiary)">
          {genre ? `${genre} · ` : ""}{novel.chapters.toLocaleString("th-TH")} ตอน
        </p>
        <p className="tabular mt-1 flex items-center gap-3 text-xs text-(--text-tertiary)">
          <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" aria-hidden />{formatNumber(novel.views)}</span>
          <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" aria-hidden />{formatNumber(novel.bookmarkCount ?? 0)}</span>
        </p>
      </div>
    </article>
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
          <HomeGridCard novel={novel} />
        </RowItem>
      ))}
    </ContentRow>
  );
}

function bannerSlideFromNovel(novel: Novel, kicker: string): BannerSlide {
  return {
    id: novel.slug,
    image: novel.backdrop || novel.cover,
    kicker,
    title: novel.thaiTitle,
    subtitle: novel.synopsis,
    href: `/novel/${novel.slug}`,
    ctaLabel: "อ่านเลย",
  };
}

function bannerSlideFromPromo(banner: PromoBannerItem): BannerSlide {
  return {
    id: banner.id,
    image: banner.image,
    kicker: "โปรโมชัน",
    title: banner.title,
    subtitle: banner.subtitle ?? undefined,
    href: banner.linkUrl ?? "/novels",
    ctaLabel: banner.ctaLabel ?? undefined,
  };
}

const MIN_BANNER_SLIDES = 3;

/**
 * The hero and its banners need only a handful of small queries, so this is
 * fetched and streamed in on its own, ahead of the six-query feed below it.
 * See app/page.tsx. Real promo banners lead; feature novels pad the strip up
 * to a minimum of 3 so the carousel never looks empty.
 */
export function HomeHeroSection({ banners, featuredNovels }: { banners: PromoBannerItem[]; featuredNovels: Novel[] }) {
  const slides: BannerSlide[] = [
    ...banners.map(bannerSlideFromPromo),
    ...featuredNovels.map((novel) => bannerSlideFromNovel(novel, "แนะนำ")),
  ].slice(0, Math.max(MIN_BANNER_SLIDES, banners.length));

  return (
    <section aria-label="แบนเนอร์แนะนำ">
      <BannerCarousel slides={slides} />
    </section>
  );
}

/** Dedup pool across the already-fetched home shelves — no extra DB query. */
function pooledNovels(data: HomeData): Novel[] {
  const map = new Map<string, Novel>();
  for (const novel of [...data.recommended, ...data.newThisWeek, ...data.completed, ...data.rankings]) {
    if (!map.has(novel.slug)) map.set(novel.slug, novel);
  }
  return [...map.values()];
}

/** A taste shelf only earns its place on Home once it has enough real matches (brief §13: "ไม่จำเป็นต้องมีทุก Section"). */
const MIN_TASTE_SHELF_SIZE = 4;

function tasteShelf(pool: Novel[], predicate: (taste: NovelTaste) => boolean, limit = 12): Novel[] {
  const matches = pool.filter((novel) => predicate(getNovelTaste(novel))).slice(0, limit);
  return matches.length >= MIN_TASTE_SHELF_SIZE ? matches : [];
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
  const pool = pooledNovels(data);
  const darkRomance = tasteShelf(pool, (taste) => taste.heat >= 4);
  const blTrending = tasteShelf(pool, (taste) => taste.relationship === "mm");
  const omegaverse = tasteShelf(pool, (taste) => taste.setting === "omegaverse");
  const possessive = tasteShelf(pool, (taste) => taste.tropes.includes("possessive"));

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <TrendingTicker novels={data.rankings.slice(0, 16)} />
      <TasteDiscovery />
      <CategoryIconRail items={data.genreShowcase} />

      {children}

      <HomeNovelCarousel
        title="สำหรับคุณ"
        description="คัดจากคะแนนและกิจกรรมการอ่านของคลัง"
        novels={data.recommended}
        href="/novels?sort=rating"
      />

      <HomeNovelCarousel
        title="เรื่องใหม่ที่น่าจับตา"
        novels={data.newThisWeek}
        href="/novels?sort=new"
      />

      <RankingTabs daily={data.rankingsDaily} weekly={data.rankings} monthly={data.rankingsMonthly} />

      <HomeNovelCarousel
        title="Dark Romance"
        description="เรื่องระดับความเข้มข้นสูง สำหรับคืนที่อยากอ่านอะไรจริงจัง"
        novels={darkRomance}
        href="/novels?heat=4-5"
      />

      <HomeNovelCarousel
        title="BL ที่กำลังมาแรง"
        novels={blTrending}
        href="/novels?relationship=mm"
      />

      <HomeNovelCarousel
        title="Omegaverse"
        novels={omegaverse}
        href="/novels?setting=omegaverse"
      />

      <HomeNovelCarousel
        title="คลั่งรัก / หวงแรง"
        novels={possessive}
        href="/novels?trope=possessive"
      />

      <HomeNovelCarousel
        title="อ่านรวดเดียวจบ"
        description="เรื่องที่เผยแพร่ครบแล้ว เก็บไว้อ่านยาวได้ทีเดียว"
        novels={data.completed}
        href="/novels?status=completed"
      />

      {data.updates.length ? (
        <div className="xl:hidden">
          <UpdateFeed
            title="อัปเดตล่าสุด"
            description="รายการอัปเดตแบบ live feed สำหรับคนที่กลับมาเช็กทุกวัน"
            href="/updates"
            items={data.updates}
          />
        </div>
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
