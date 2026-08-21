import { Skeleton } from "@/components/ui/section";

export default function NewChapterLoading() {
  return (
    <div className="flex min-h-dvh flex-col" aria-hidden>
      <div className="flex h-14 shrink-0 items-center border-b border-border px-5">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="mx-auto grid w-full max-w-[800px] flex-1 gap-4 px-4 py-10">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-9 w-56" />
        <Skeleton className="mt-2 h-96 w-full" />
      </div>
    </div>
  );
}
