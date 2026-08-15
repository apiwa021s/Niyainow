import { PageShell, Skeleton } from "@/components/ui/section";

export default function ChaptersLoading() {
  return (
    <PageShell className="space-y-5">
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-14 w-full" />
      <div className="divide-y divide-border rounded-[8px] border border-border">
        {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-16 w-full rounded-none" />)}
      </div>
    </PageShell>
  );
}
