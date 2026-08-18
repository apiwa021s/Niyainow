import { cacheLife, cacheTag } from "next/cache";
import { Suspense, type ReactNode } from "react";

import { HomeFeed, HomePersonalizedSections, HomeSignup, type HomeData } from "@/components/home/home-feed";
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

async function CachedHomeFeed({ children, signupSlot }: { children: ReactNode; signupSlot: ReactNode }) {
  "use cache";
  cacheLife(PUBLIC_CACHE_LIFE.live);
  cacheTag("public-novels", "public-chapters", "public-rankings", "public-taxonomy", "public-banners");

  const [newThisWeek, recommended, completed, rankings, updates, genreShowcase, banners, featured] = await Promise.all([
    getNewThisWeek(12),
    getRecommendedNovels(12),
    getCompletedNovels(12),
    getRankings("WEEKLY", 16),
    getUpdates("all", undefined, 15),
    getGenreShowcase(10),
    getActiveBanners(),
    getFeaturedNovels(1),
  ]);
  const data: HomeData = {
    newThisWeek,
    recommended,
    completed,
    rankings,
    updates,
    genreShowcase,
    spotlightNovel: featured[0] ?? recommended[0] ?? newThisWeek[0],
  };

  return (
    <HomeFeed data={data} banners={banners} signupSlot={signupSlot}>
      {children}
    </HomeFeed>
  );
}

export default function HomePage() {
  return (
    <main id="main" className="mx-auto w-full max-w-(--home-max) px-3 py-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-4 lg:px-5 lg:pb-6 2xl:px-6">
      <h1 className="sr-only">NiyaiThai — อ่านนิยายแปลไทยและค้นหาเรื่องถัดไป</h1>
      <CachedHomeFeed
        signupSlot={
          <Suspense fallback={null}>
            <HomeGuestSignup />
          </Suspense>
        }
      >
        <Suspense fallback={<GuestContinueReading />}>
          <HomeReaderSections />
        </Suspense>
      </CachedHomeFeed>
    </main>
  );
}
