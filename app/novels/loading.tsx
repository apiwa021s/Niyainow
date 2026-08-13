import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";

export default function NovelsLoading() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-20 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="skeleton hidden h-[520px] rounded-[16px] lg:block" />
        <div>
          <div className="skeleton h-8 w-48 rounded" />
          <div className="skeleton mt-2 h-4 w-32 rounded" />
          <div className="mt-5">
            <NovelGridSkeleton count={12} />
          </div>
        </div>
      </div>
    </main>
  );
}
