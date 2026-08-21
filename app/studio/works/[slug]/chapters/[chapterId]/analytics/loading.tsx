import { Skeleton } from "@/components/ui/section";

export default function ChapterAnalyticsLoading() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}
