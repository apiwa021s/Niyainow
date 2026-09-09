import { Suspense, ViewTransition, type ReactNode } from "react";

import { HomeFeed, HomeHeroSection, HomePersonalizedSections, HomeSignup, type HomeData } from "@/components/home/home-feed";
import { HomeFeedSkeleton, HomeHeroSkeleton } from "@/components/home/home-skeletons";
import { GuestContinueReading } from "@/components/reader/guest-continue-reading";
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
import { getCurrentUser } from "@/lib/auth/dal";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

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
  const followedUpdates = await getUpdatesForNovels(personalization.followedNovelSlugs, 12);
  const renderedAccountSlugs = personalization.continueReading
    .slice(0, 5)
    .map((item) => item.novel.slug);

  return (
    <>
      <GuestContinueReading
        excludeSlugs={renderedAccountSlugs}
        title="อ่านต่อจากอุปกรณ์นี้"
      />
      <HomePersonalizedSections
        personalization={personalization}
        followedUpdates={followedUpdates}
      />
    </>
  );
}

async function HomeGuestSignup() {
  const currentUser = await getCurrentUser();
  return currentUser?.status === "ACTIVE" ? null : <HomeSignup />;
}

async function PublicHomeHero() {
  const [banners, featuredNovels] = await Promise.all([
    getActiveBanners(6),
    getFeaturedNovels(6),
  ]);
  return <HomeHeroSection banners={banners} featuredNovels={featuredNovels} />;
}

async function PublicHomeFeed({ children, signupSlot }: { children: ReactNode; signupSlot: ReactNode }) {
  const [
    newThisWeek,
    recommended,
    completed,
    rankings,
    rankingsDaily,
    rankingsMonthly,
    updates,
    genreShowcase,
  ] = await Promise.all([
      getNewThisWeek(12),
      getRecommendedNovels(12),
      getCompletedNovels(12),
      getRankings("WEEKLY", 16),
      getRankings("DAILY", 16),
      getRankings("MONTHLY", 16),
      getUpdates("all", undefined, 12),
      getGenreShowcase(17),
    ]);
  const data: HomeData = { newThisWeek, recommended, completed, rankings, rankingsDaily, rankingsMonthly, updates, genreShowcase };
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
      <div className="flex flex-col gap-3">
        <Suspense fallback={<HomeHeroSkeleton />}>
          <PublicHomeHero />
        </Suspense>

        <Suspense fallback={<HomeFeedSkeleton />}>
          <PublicHomeFeed
            signupSlot={
              <Suspense key="home-signup" fallback={null}>
                <HomeGuestSignup />
              </Suspense>
            }
          >
            <Suspense fallback={<GuestContinueReading />}>
              <HomeReaderSections />
            </Suspense>
          </PublicHomeFeed>
        </Suspense>
      </div>
    </main>
    </ViewTransition>
  );
}
