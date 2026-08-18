import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";
import { PageShell, Skeleton } from "@/components/ui/section";

export default function GenreLoading() {
  return (
    <PageShell className="space-y-14">
      <p role="status" className="sr-only">กำลังเตรียมหน้านิยายตามแนว</p>
      <div className="py-3 sm:py-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="mt-3 h-12 w-[min(440px,82%)]" />
        <Skeleton className="mt-4 h-4 w-[min(620px,95%)]" />
        <Skeleton className="mt-2 h-4 w-[min(500px,80%)]" />
        <Skeleton className="mt-4 h-3 w-28" />
      </div>

      {Array.from({ length: 4 }, (_, index) => (
        <section key={index} aria-hidden>
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mb-5 mt-2 h-7 w-44" />
          <NovelGridSkeleton count={6} />
        </section>
      ))}

      <section aria-hidden>
        <div>
          <Skeleton className="h-3 w-28" />
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div><Skeleton className="h-9 w-60" /><Skeleton className="mt-2 h-4 w-72 max-w-full" /></div>
            <div className="flex gap-2"><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-36" /></div>
          </div>
        </div>
        <div className="mt-6"><NovelGridSkeleton count={12} /></div>
      </section>
    </PageShell>
  );
}
