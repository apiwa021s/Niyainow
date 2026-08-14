import { HomeFeed, type HomeData } from "@/components/home/home-feed";
import { HomeHero } from "@/components/home/home-hero";
import { PromoBanners } from "@/components/home/promo-banners";
import { getCurrentUser } from "@/lib/auth/dal";
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
import type { Novel } from "@/types/novel";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

export default async function HomePage() {
  const [featured, newThisWeek, recommended, rankings, completed, updates, genreShowcase, banners, currentUser] = await Promise.all([
    getFeaturedNovels(),
    getNewThisWeek(12),
    getRecommendedNovels(12),
    getRankings("WEEKLY", 12),
    getCompletedNovels(12),
    getUpdates("all", undefined, 12),
    getGenreShowcase(8),
    getActiveBanners(),
    getCurrentUser(),
  ]);
  const personalization = currentUser?.status === "ACTIVE" ? await getHomePersonalization(currentUser.id) : undefined;
  const followedUpdates = personalization?.followedNovelSlugs.length
    ? await getUpdatesForNovels(personalization.followedNovelSlugs, 8)
    : [];
  const allNovels: Novel[] = [
    ...featured,
    ...newThisWeek,
    ...recommended,
    ...rankings,
    ...completed,
    ...updates.map((item) => item.novel),
    ...followedUpdates.map((item) => item.novel),
  ];
  const novelsBySlug = Object.fromEntries(allNovels.map((novel) => [novel.slug, novel]));
  const data: HomeData = {
    featured,
    newThisWeek,
    recommended,
    rankings,
    completed,
    updates,
    followedUpdates,
    genreShowcase,
    novelsBySlug,
    personalization,
  };

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      <HomeFeed
        data={data}
        hero={<HomeHero novels={data.featured} />}
        banners={banners.length ? <PromoBanners banners={banners} /> : null}
      />
    </main>
  );
}
