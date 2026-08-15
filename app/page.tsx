import { cache, Suspense } from "react";

import { HomeFeed, HomePersonalizedSections, HomeSignup, type HomeData } from "@/components/home/home-feed";
import { getCurrentUser } from "@/lib/auth/dal";
import { pageMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import {
  getActiveBanners,
  getGenreShowcase,
  getNewThisWeek,
  getRankings,
  getRecommendedNovels,
  getUpdates,
  getUpdatesForNovels,
} from "@/services/novel-service";
import { getHomePersonalization } from "@/services/user-service";
import type { Novel } from "@/types/novel";

export const metadata = pageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

const getHomeAccountData = cache(async () => {
  const currentUser = await getCurrentUser();
  if (currentUser?.status !== "ACTIVE") return null;

  const personalization = await getHomePersonalization(currentUser.id);
  const followedUpdates = personalization.followedNovelSlugs.length
    ? await getUpdatesForNovels(personalization.followedNovelSlugs, 8)
    : [];
  return { personalization, followedUpdates };
});

async function AccountHomeSections() {
  const account = await getHomeAccountData();
  return account ? <HomePersonalizedSections {...account} /> : null;
}

async function AccountSignup() {
  const account = await getHomeAccountData();
  return account ? null : <HomeSignup />;
}

export default async function HomePage() {
  const [newThisWeek, recommended, rankings, updates, genreShowcase, banners] = await Promise.all([
    getNewThisWeek(12),
    getRecommendedNovels(12),
    getRankings("WEEKLY", 12),
    getUpdates("all", undefined, 12),
    getGenreShowcase(8),
    getActiveBanners(),
  ]);
  const allNovels: Novel[] = [
    ...newThisWeek,
    ...recommended,
    ...rankings,
    ...updates.map((item) => item.novel),
  ];
  const novelsBySlug = Object.fromEntries(allNovels.map((novel) => [novel.slug, novel]));
  const data: HomeData = {
    newThisWeek,
    recommended,
    rankings,
    updates,
    genreShowcase,
    novelsBySlug,
  };

  return (
    <main id="main" className="mx-auto w-full max-w-[1440px] px-4 pb-24 pt-[84px] sm:px-6 lg:px-8">
      <HomeFeed
        data={data}
        banners={banners}
        accountSections={<Suspense fallback={null}><AccountHomeSections /></Suspense>}
        signupSlot={<Suspense fallback={null}><AccountSignup /></Suspense>}
      />
    </main>
  );
}
