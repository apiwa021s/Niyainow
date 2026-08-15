import Link from "next/link";
import { ArrowRight, BellRing, BookMarked, LibraryBig } from "lucide-react";
import type { ReactNode } from "react";

import { ContentRow, RowItem } from "@/components/home/content-row";
import { GenrePicker } from "@/components/home/genre-picker";
import { StorySpotlight } from "@/components/home/home-hero";
import { PromoBanners } from "@/components/home/promo-banners";
import { UpdateFeed } from "@/components/home/update-feed";
import {
  DiscoveryNovelCard,
  EditorialRecommendationCard,
  RankingNovelCard,
} from "@/components/novels/novel-card";
import { AccountContinueReadingCard } from "@/components/reader/guest-continue-reading";
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

function EditorialHeading({ kicker, title, description, href }: { kicker: string; title: string; description?: string; href?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className="mt-1 h-10 w-0.5 shrink-0 bg-[var(--brand-primary)]" />
        <div>
          <p className="editorial-kicker">{kicker}</p>
          <h2 className="font-serif text-2xl font-semibold sm:text-3xl">{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {href ? (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)]">
          ดูทั้งหมด <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
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
  const primaryBanner = banners[0];
  const extraBanners = banners.slice(1);

  return (
    <div className="flex flex-col gap-14 lg:gap-20">
      {guestContinueSlot}
      {accountSections}

      <StorySpotlight banner={primaryBanner} novel={data.spotlightNovel} />

      {data.rankings.length ? (
        <section className="render-deferred">
          <EditorialHeading kicker="ความนิยม 7 วัน" title="กำลังได้รับความนิยม" description="อ้างอิงกิจกรรมการอ่านในช่วงสัปดาห์ล่าสุด" href="/rankings" />
          <div className="grid border-t border-border lg:grid-cols-2 lg:gap-x-8">
            {data.rankings.slice(0, 10).map((novel, index) => <RankingNovelCard key={novel.slug} novel={novel} rank={index + 1} />)}
          </div>
        </section>
      ) : null}

      {data.genreShowcase.length ? <GenrePicker items={data.genreShowcase} /> : null}

      {data.recommended.length ? (
        <section className="render-deferred">
          <EditorialHeading
            kicker="คัดจากคะแนนผู้อ่าน"
            title="เรื่องที่ผู้อ่านให้คะแนนสูง"
            description="เรียงจากคะแนนจริงในคลัง ไม่ใช่คำแนะนำเฉพาะบุคคล"
            href="/novels?sort=rating"
          />
          <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden">
            {data.recommended.slice(0, 8).map((novel) => <div key={novel.slug} className="snap-start"><EditorialRecommendationCard novel={novel} /></div>)}
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
          <EditorialHeading kicker="อ่านได้จนจบ" title="เรื่องจบแล้ว" description="เลือกเริ่มเมื่อพร้อม แล้วอ่านต่อได้ครบทุกตอนที่เผยแพร่" href="/novels?status=completed&sort=rating" />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
            {data.completed.slice(0, 6).map((novel) => <li key={novel.slug}><DiscoveryNovelCard novel={novel} fluid /></li>)}
          </ul>
        </section>
      ) : null}

      {data.newThisWeek.length ? (
        <section className="render-deferred">
          <EditorialHeading kicker="เผยแพร่ใน 7 วันล่าสุด" title="มาใหม่สัปดาห์นี้" description="เรื่องที่เพิ่งเปิดให้อ่านในคลัง" href="/novels?sort=new" />
          <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-6 lg:gap-x-5">
            {data.newThisWeek.slice(0, 6).map((novel) => <li key={novel.slug}><DiscoveryNovelCard novel={novel} fluid /></li>)}
          </ul>
        </section>
      ) : null}

      {extraBanners.length ? <PromoBanners banners={extraBanners} /> : null}
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
          {continueItems.map((item) => {
            return (
              <RowItem key={item.novel.slug}>
                <AccountContinueReadingCard item={item} />
              </RowItem>
            );
          })}
        </ContentRow>
      ) : null}

      <UpdateFeed
        title="ตอนใหม่จากเรื่องที่ติดตาม"
        description="อัปเดตจากรายการติดตามของคุณ"
        href="/library/following"
        items={followedUpdates.slice(0, 6)}
        novelsBySlug={novelsBySlug}
        emptyText={personalization.followedNovelSlugs.length ? "เรื่องที่ติดตามยังไม่มีตอนใหม่" : "กดติดตามนิยาย แล้วตอนใหม่จะปรากฏตรงนี้"}
      />
    </>
  );
}

export function HomeSignup() {
  return (
    <section className="render-deferred grid gap-6 rounded-[8px] border border-border bg-card p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
      <div>
        <p className="editorial-kicker">ชั้นหนังสือส่วนตัว</p>
        <h2 className="mt-1 font-serif text-2xl font-semibold">เข้าสู่ระบบฟรี แล้วอ่านต่อได้ทุกอุปกรณ์</h2>
        <ul className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: BookMarked, title: "บันทึกตำแหน่งอ่าน" },
            { icon: BellRing, title: "ติดตามตอนใหม่" },
            { icon: LibraryBig, title: "จัดชั้นหนังสือส่วนตัว" },
          ].map((item) => {
            const Icon = item.icon;
            return <li key={item.title} className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-[var(--brand-emphasis)]" />{item.title}</li>;
          })}
        </ul>
      </div>
      <Link href="/login" className="inline-flex h-12 items-center rounded-[8px] bg-[var(--brand-primary)] px-6 font-semibold text-white">เข้าสู่ระบบด้วย Google</Link>
    </section>
  );
}
