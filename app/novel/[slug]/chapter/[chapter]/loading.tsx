import { Skeleton } from "@/components/ui/section";

export default function ReaderLoading() {
  return (
    <main className="min-h-screen bg-[var(--reader-paper,var(--background))]" aria-busy="true">
      <div className="sticky top-0 border-b border-border bg-background/95 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <Skeleton className="h-11 w-11" />
          <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
          <Skeleton className="h-11 w-11" />
        </div>
      </div>
      <article className="mx-auto max-w-3xl space-y-7 px-5 py-12 sm:px-8">
        <Skeleton className="mx-auto h-9 w-4/5" />
        {["w-[90%]", "w-full", "w-[86%]", "w-[96%]", "w-[78%]", "w-[92%]", "w-[84%]"].map((width, index) => (
          <Skeleton key={`${width}-${index}`} className={`h-5 ${width}`} />
        ))}
      </article>
    </main>
  );
}
