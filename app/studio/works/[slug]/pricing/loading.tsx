import { Skeleton } from "@/components/ui/section";

export default function StoryPricingLoading() {
  return (
    <div className="grid gap-5" aria-hidden>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-72 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}
