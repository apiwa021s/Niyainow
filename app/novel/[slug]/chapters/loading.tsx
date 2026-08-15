import { PageShell, Skeleton } from "@/components/ui/section";

export default function ChaptersLoading() {
  return (
    <PageShell aria-busy="true" className="space-y-5">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-[minmax(0,1fr)_170px_96px]">
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
      <div className="divide-y divide-border border-y border-border">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="grid min-h-16 grid-cols-[72px_1fr] items-center gap-4 py-3 sm:grid-cols-[112px_1fr_120px]">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-[min(100%,32rem)]" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
          </div>
        ))}
      </div>
    </PageShell>
  );
}
