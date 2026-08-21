import { Skeleton } from "@/components/ui/section";

export default function StudioWorkLoading() {
  return (
    <div className="grid gap-5" aria-hidden>
      <div className="flex flex-wrap items-start gap-4">
        <Skeleton className="h-36 w-24 rounded-[8px]" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-5 w-40" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-11 w-36 rounded-[6px]" />
            <Skeleton className="h-11 w-28 rounded-[6px]" />
          </div>
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
