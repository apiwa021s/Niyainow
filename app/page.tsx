import { cacheLife, cacheTag } from "next/cache";
import { Suspense, ViewTransition, type ReactNode } from "react";

import { HomeFeed, HomeHeroSection, HomePersonalizedSections, HomeSignup, type HomeData } from "@/components/home/home-feed";
import { HomeFeedSkeleton, HomeHeroSkeleton } from "@/components/home/home-skeletons";
import { GuestContinueReading } from "@/components/reader/guest-continue-reading";
import { getCurrentUser } from "@/lib/auth/dal";
import { PUBLIC_CACHE_LIFE } from "@/lib/cache/public-cache-profiles";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import {
  getActiveBanners,
  getCompletedNovels,
  getFeaturedNovels,
  getGenreShowcase,
  getNewThisWeek,
  getRankings,
  getRecommendedNovels,
  getUpdates,
  getUpdatesForNovels,
} from "@/services/novel-service";
import { getHomePersonalization } from "@/services/user-service";

export const metadata = pageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

async function HomeReaderSections() {
  const currentUser = await getCurrentUser();
  if (currentUser?.status !== "ACTIVE") {
    return <GuestContinueReading />;
  }

  const personalization = await getHomePersonalization(currentUser.id);
  const followedUpdates = personalization.followedNovelSlugs.length
    ? await getUpdatesForNovels(personalization.followedNovelSlugs, 10)
    : [];
  const renderedAccountSlugs = personalization.continueReading
    .slice(0, 5)
    .map((item) => item.novel.slug);
  const hasPersonalizedSections = Boolean(
    personalization.continueReading.length || personalization.followedNovelSlugs.length,
  );

  return (
    <>
      <GuestContinueReading
        excludeSlugs={renderedAccountSlugs}
        title="อ่านต่อจากอุปกรณ์นี้"
      />
      {hasPersonalizedSections ? (
        <HomePersonalizedSections personalization={personalization} followedUpdates={followedUpdates} />
      ) : null}
    </>
  );
}

async function HomeGuestSignup() {
  const currentUser = await getCurrentUser();
  return currentUser?.status === "ACTIVE" ? null : <HomeSignup />;
}

/**
 * The hero is the first thing on screen and only ever needs two small
 * queries, so it gets its own cache/Suspense boundary instead of sharing the
 * six-query one below — otherwise it would wait on the slowest of all eight,
 * which is what made the whole page feel stalled on first paint.
 */
async function CachedHomeHero() {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.live);
  cacheTag("public-novels", "public-banners");

  const [banners, featured, recommendedFallback] = await Promise.all([
    getActiveBanners(),
    getFeaturedNovels(1),
    getRecommendedNovels(1),
  ]);

  return <HomeHeroSection novel={featured[0] ?? recommendedFallback[0]} banner={banners[0]} />;
}

async function CachedHomeFeed({ children, signupSlot }: { children: ReactNode; signupSlot: ReactNode }) {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.live);
  cacheTag("public-novels", "public-chapters", "public-rankings", "public-taxonomy");

  const [newThisWeek, recommended, completed, rankings, updates, genreShowcase] = await Promise.all([
    getNewThisWeek(12),
    getRecommendedNovels(12),
    getCompletedNovels(12),
    getRankings("WEEKLY", 16),
    getUpdates("all", undefined, 15),
    getGenreShowcase(10),
  ]);
  const data: HomeData = { newThisWeek, recommended, completed, rankings, updates, genreShowcase };

  return (
    <HomeFeed data={data} signupSlot={signupSlot}>
      {children}
    </HomeFeed>
  );
}

export default function HomePage() {
  return (
    <ViewTransition
      enter={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      exit={{ "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" }}
      default="none"
    >
    <main id="main" className="mx-auto w-full max-w-(--home-max) px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-5 lg:pb-6 2xl:px-6">
      <h1 className="sr-only">อ่านนิยายออนไลน์และนิยายแปลไทย อัปเดตตอนใหม่ทุกวัน</h1>
      <div className="flex flex-col gap-4 lg:gap-5">
        <Suspense fallback={<HomeHeroSkeleton />}>
          <CachedHomeHero />
        </Suspense>

        <Suspense fallback={<HomeFeedSkeleton />}>
          <CachedHomeFeed
            signupSlot={
              <Suspense key="home-signup" fallback={null}>
                <HomeGuestSignup />
              </Suspense>
            }
          >
            <Suspense fallback={<GuestContinueReading />}>
              <HomeReaderSections />
            </Suspense>
          </CachedHomeFeed>
        </Suspense>
      </div>
    </main>
    </ViewTransition>
  );
}
