import { InkLogoLoader } from "@/components/ui/ink-logo-loader";
import { PageShell, Skeleton } from "@/components/ui/section";

export default function NovelLoading() {
  return (
    <PageShell aria-busy="true" className="space-y-12 lg:space-y-16">
      <InkLogoLoader />
      <p role="status" className="sr-only">กำลังเตรียมรายละเอียดนิยาย</p>
      <Skeleton className="h-11 w-72 max-w-full" />

      <section className="grid gap-7 rounded-(--r-lg) bg-surface px-4 py-7 md:grid-cols-[190px_minmax(0,1fr)] md:gap-9 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-6 lg:py-10">
        <Skeleton className="aspect-[2/3] w-[160px] rounded-[6px] sm:w-[190px] lg:w-[220px]" />
        <div className="min-w-0 space-y-4 py-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-12 w-4/5 max-w-2xl" />
          <Skeleton className="h-4 w-56" />
          <div className="flex flex-wrap gap-2 pt-1">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-28" />
            <Skeleton className="h-11 w-24" />
          </div>
          <div className="space-y-2 pt-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[92%]" />
            <Skeleton className="h-4 w-[76%]" />
          </div>
        </div>
      </section>

      <section className="rounded-(--r-md) bg-surface-subtle px-4 py-5">
        <Skeleton className="h-4 w-36" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="border-l-2 border-border pl-3">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="mt-2 h-3 w-28" />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-14">
        <div className="space-y-10">
          <section className="space-y-3">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-[96%]" />
            <Skeleton className="h-5 w-[84%]" />
          </section>
          <section>
            <Skeleton className="h-8 w-52" />
            {[1, 2, 3].map((item) => <Skeleton key={item} className="mt-4 h-16 w-full" />)}
          </section>
        </div>
        <aside className="space-y-4 lg:pl-7">
          <Skeleton className="h-4 w-28" />
          {[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-11 w-full" />)}
        </aside>
      </div>
    </PageShell>
  );
}
