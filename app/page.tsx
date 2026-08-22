import { Suspense, ViewTransition, type ReactNode } from "react";

import { HomeFeed, HomeHeroSection, HomePersonalizedSections, HomeSignup, type HomeData } from "@/components/home/home-feed";
import { HomeFeedSkeleton, HomeHeroSkeleton } from "@/components/home/home-skeletons";
import { GuestContinueReading } from "@/components/reader/guest-continue-reading";
import {
  studioHomeBanners,
  studioHomeData,
  studioHomePersonalization,
  studioHomePublishedNovels,
  studioHomeUpdates,
} from "@/data/studio-reader-home";
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

  const renderedAccountSlugs = studioHomePersonalization.continueReading
    .slice(0, 5)
    .map((item) => item.novel.slug);

  return (
    <>
      <GuestContinueReading
        excludeSlugs={renderedAccountSlugs}
        title="อ่านต่อจากอุปกรณ์นี้"
      />
      <HomePersonalizedSections
        personalization={studioHomePersonalization}
        followedUpdates={studioHomeUpdates}
      />
    </>
  );
}

async function HomeGuestSignup() {
  const currentUser = await getCurrentUser();
  return currentUser?.status === "ACTIVE" ? null : <HomeSignup />;
}

async function MockHomeHero() {
  return <HomeHeroSection banners={studioHomeBanners} featuredNovels={studioHomePublishedNovels} />;
}

async function MockHomeFeed({ children, signupSlot }: { children: ReactNode; signupSlot: ReactNode }) {
  const data: HomeData = studioHomeData;
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
          <MockHomeHero />
        </Suspense>

        <Suspense fallback={<HomeFeedSkeleton />}>
          <MockHomeFeed
            signupSlot={
              <Suspense key="home-signup" fallback={null}>
                <HomeGuestSignup />
              </Suspense>
            }
          >
            <Suspense fallback={<GuestContinueReading />}>
              <HomeReaderSections />
            </Suspense>
          </MockHomeFeed>
        </Suspense>
      </div>
    </main>
    </ViewTransition>
  );
}
