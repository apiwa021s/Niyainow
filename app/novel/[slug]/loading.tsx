import { PageShell, Skeleton } from "@/components/ui/section";

export default function NovelLoading() {
  return (
    <PageShell className="space-y-6">
      <div className="grid gap-6 border-b border-border pb-8 md:grid-cols-[190px_1fr] xl:grid-cols-[240px_1fr_260px]">
        <Skeleton className="aspect-[2/3] w-[190px] rounded-[6px] xl:w-[240px]" />
        <div className="space-y-4 py-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-4/5" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-64" />
        </div>
        <Skeleton className="hidden h-64 xl:block" />
      </div>
      <div className="grid grid-cols-2 gap-px sm:grid-cols-3 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-24" />)}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Skeleton className="h-96" />
        <Skeleton className="h-72" />
      </div>
    </PageShell>
  );
}
