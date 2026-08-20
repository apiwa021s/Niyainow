import { PageShell } from "@/components/ui/section";
import { InkLogoLoader } from "@/components/ui/ink-logo-loader";
import { HomeFeedSkeleton, HomeHeroSkeleton } from "@/components/home/home-skeletons";

export default function Loading() {
  return (
    <PageShell className="max-w-(--home-max) 2xl:px-6">
      <InkLogoLoader />
      <p role="status" className="sr-only">กำลังเตรียมหน้าแรก</p>
      <div className="flex flex-col gap-4 lg:gap-5">
        <HomeHeroSkeleton />
        <HomeFeedSkeleton />
      </div>
    </PageShell>
  );
}
