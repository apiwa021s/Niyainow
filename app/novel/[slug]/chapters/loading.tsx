import { PageShell, Skeleton } from "@/components/ui/section";

export default function ChaptersLoading() {
  return (
    <PageShell aria-busy="true" className="space-y-5">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-11 min-w-0 flex-1" />
        <Skeleton className="h-11 w-11 shrink-0" />
      </div>
      <div className="overflow-hidden rounded-(--r-lg) border border-border">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex min-h-15 items-center justify-between border-b border-border bg-surface-subtle px-4 last:border-b-0 sm:px-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-5" />
          </div>
        ))}
        <div className="divide-y divide-border border-t border-border">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="flex min-h-24 items-start justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-[min(100%,32rem)]" />
                <Skeleton className="mt-3 h-4 w-36" />
              </div>
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
