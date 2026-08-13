import { HomeFeed, type HomeData } from "@/components/home/home-feed";
import { HomeHero } from "@/components/home/home-hero";
import {
  getCompletedNovels,
  getFeaturedNovels,
  getGenreShowcase,
  getNewThisWeek,
  getNovels,
  getRankings,
  getRecommendedNovels,
  getUpdates
} from "@/services/novel-service";

export default function HomePage() {
  const novelsBySlug = Object.fromEntries(getNovels().map((novel) => [novel.slug, novel]));

  const data: HomeData = {
    featured: getFeaturedNovels(),
    newThisWeek: getNewThisWeek(12),
    recommended: getRecommendedNovels(),
    rankings: getRankings(),
    completed: getCompletedNovels(12),
    updates: getUpdates(),
    genreShowcase: getGenreShowcase(8),
    novelsBySlug
  };

  return (
    <main id="main" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
      {/* hero ส่งเป็น prop เพราะผู้ใช้ที่ login แล้วจะไม่เห็น hero — HomeFeed เป็นคนตัดสิน */}
      <HomeFeed data={data} hero={<HomeHero novels={data.featured} />} />
    </main>
  );
}
