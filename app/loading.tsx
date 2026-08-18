import { PageShell, Skeleton } from "@/components/ui/section";

const COVER_PLACEHOLDERS = Array.from({ length: 12 }, (_, index) => index);

function CoverRowSkeleton() {
  return (
    <section aria-hidden className="flex flex-col gap-2.5">
      <div className="flex h-8 items-center justify-between gap-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="rail-scroll flex gap-2.5">
        {COVER_PLACEHOLDERS.map((index) => (
          <Skeleton
            key={index}
            className="aspect-2/3 w-[84px] shrink-0 rounded-(--r-md) sm:w-[96px] lg:w-[108px] xl:w-[118px]"
          />
        ))}
      </div>
    </section>
  );
}

export default function Loading() {
  return (
    <PageShell className="max-w-(--home-max) 2xl:px-6">
      <p role="status" className="sr-only">กำลังเตรียมหน้าแรก</p>
      <div className="flex flex-col gap-4 lg:gap-5">
        <section aria-hidden className="overflow-hidden rounded-(--r-lg) border border-border bg-surface">
          <div className="hidden h-[clamp(240px,26vw,340px)] p-5 sm:block">
            <div className="flex h-full max-w-[560px] flex-col justify-center gap-3">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-9 w-[min(460px,85%)]" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="mt-1 h-11 w-28 rounded-full" />
            </div>
          </div>
          <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-3 p-2.5 sm:hidden">
            <Skeleton className="aspect-2/3 w-[84px] rounded-(--r-md)" />
            <div className="flex min-w-0 flex-col gap-2 py-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-6 w-[92%]" />
              <Skeleton className="h-4 w-[70%]" />
              <Skeleton className="mt-auto h-10 w-full rounded-full" />
            </div>
          </div>
        </section>

        <div aria-hidden className="hidden grid-cols-3 gap-2 xl:grid">
          {COVER_PLACEHOLDERS.slice(0, 3).map((index) => (
            <div key={index} className="flex min-h-14 items-center gap-2.5 rounded-(--r-md) border border-border bg-card p-2.5">
              <Skeleton className="h-8 w-8 shrink-0 rounded-(--r-md)" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1.5 h-3 w-[min(180px,80%)]" />
              </div>
            </div>
          ))}
        </div>

        <section aria-hidden className="rounded-(--r-lg) border border-border bg-surface p-2.5">
          <div className="mb-2 flex items-center justify-between">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="rail-scroll flex gap-2">
            {COVER_PLACEHOLDERS.map((index) => (
              <Skeleton key={index} className="h-[70px] w-[154px] shrink-0 rounded-(--r-md)" />
            ))}
          </div>
        </section>

        <div aria-hidden className="rail-scroll flex gap-2">
          {COVER_PLACEHOLDERS.slice(0, 6).map((index) => (
            <Skeleton key={index} className="h-9 w-28 shrink-0 rounded-full" />
          ))}
        </div>

        <CoverRowSkeleton />
        <CoverRowSkeleton />
      </div>
    </PageShell>
  );
}
