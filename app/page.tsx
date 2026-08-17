import { HomeFeed, HomePersonalizedSections, HomeSignup, type HomeData } from "@/components/home/home-feed";
import { GuestContinueReading } from "@/components/reader/guest-continue-reading";
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

export const metadata = pageMetadata({
  title: siteConfig.title,
  description: siteConfig.description,
  path: "/",
});

async function getHomeAccountData() {
  const currentUser = await getCurrentUser();
  if (currentUser?.status !== "ACTIVE") return null;

  const personalization = await getHomePersonalization(currentUser.id);
  const followedUpdates = personalization.followedNovelSlugs.length
    ? await getUpdatesForNovels(personalization.followedNovelSlugs, 8)
    : [];
  return { personalization, followedUpdates };
}

export default async function HomePage() {
  const [newThisWeek, recommended, completed, rankings, updates, genreShowcase, banners, featured, account] = await Promise.all([
    getNewThisWeek(12),
    getRecommendedNovels(12),
    getCompletedNovels(12),
    getRankings("WEEKLY", 12),
    getUpdates("all", undefined, 12),
    getGenreShowcase(8),
    getActiveBanners(),
    getFeaturedNovels(1),
    getHomeAccountData(),
  ]);
  const allNovels: Novel[] = [
    ...newThisWeek,
    ...recommended,
    ...completed,
    ...rankings,
    ...updates.map((item) => item.novel),
  ];
  const novelsBySlug = Object.fromEntries(allNovels.map((novel) => [novel.slug, novel]));
  const data: HomeData = {
    newThisWeek,
    recommended,
    completed,
    rankings,
    updates,
    genreShowcase,
    novelsBySlug,
    spotlightNovel: featured[0] ?? recommended[0] ?? newThisWeek[0],
  };
  const hasPersonalizedSections = Boolean(
    account && (account.personalization.continueReading.length || account.personalization.followedNovelSlugs.length),
  );
  const renderedAccountSlugs = account?.personalization.continueReading
    .slice(0, 5)
    .map((item) => item.novel.slug) ?? [];

  return (
    <main id="main" className="mx-auto w-full max-w-(--shell-max) px-3 py-3 sm:px-4 lg:px-5">
      <h1 className="sr-only">NiyaiThai — อ่านนิยายแปลไทยและค้นหาเรื่องถัดไป</h1>
      <HomeFeed
        data={data}
        banners={banners}
        accountSections={hasPersonalizedSections && account ? <HomePersonalizedSections {...account} /> : null}
        guestContinueSlot={
          <GuestContinueReading
            excludeSlugs={renderedAccountSlugs}
            title={account ? "อ่านต่อจากอุปกรณ์นี้" : undefined}
          />
        }
        signupSlot={!account ? <HomeSignup /> : null}
      />
    </main>
  );
}
