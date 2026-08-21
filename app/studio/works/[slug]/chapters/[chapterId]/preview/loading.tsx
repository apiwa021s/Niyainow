import { Skeleton } from "@/components/ui/section";

export default function ChapterPreviewLoading() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-10" aria-hidden>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-4 h-8 w-2/3" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
