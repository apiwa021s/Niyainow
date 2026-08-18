import { PageShell, Skeleton } from "@/components/ui/section";

export default function TagsLoading() {
  return (
    <PageShell className="space-y-10 lg:space-y-14">
      <p role="status" className="sr-only">กำลังโหลดแท็กนิยาย</p>
      <header aria-hidden className="grid gap-5 py-2 sm:py-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,520px)] lg:items-end">
        <div>
          <Skeleton className="h-3 w-44" />
          <Skeleton className="mt-3 h-9 w-52" />
          <Skeleton className="mt-3 h-4 w-[min(620px,92%)]" />
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </header>
      <section aria-hidden>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-7 w-72 max-w-full" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="min-h-32 rounded-[8px] bg-card/70 p-4">
              <Skeleton className="h-3 w-6" />
              <Skeleton className="mt-12 h-5 w-28" />
              <Skeleton className="mt-2 h-3 w-16" />
            </div>
          ))}
        </div>
      </section>
      <section aria-hidden>
        <Skeleton className="h-7 w-48" />
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 12 }, (_, index) => (
            <div key={index} className="flex min-h-20 items-center justify-between rounded-[8px] bg-card/70 px-4 py-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
