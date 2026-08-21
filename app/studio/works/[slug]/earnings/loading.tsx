import { Skeleton } from "@/components/ui/section";

export default function StoryEarningsLoading() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Skeleton className="h-5 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <div className="flex gap-6 pt-1">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
