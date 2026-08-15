import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";
import { PageShell, Skeleton } from "@/components/ui/section";

export default function NovelsLoading() {
  return (
    <PageShell className="space-y-12">
      <p role="status" className="sr-only">กำลังเตรียมหน้าสำรวจและคลังนิยาย</p>
      <div className="grid gap-6 border-y border-border py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
        <div><Skeleton className="h-3 w-36" /><Skeleton className="mt-3 h-11 w-[min(480px,85%)]" /><Skeleton className="mt-4 h-4 w-[min(620px,95%)]" /><Skeleton className="mt-2 h-4 w-[min(520px,82%)]" /></div>
        <div className="border-l-2 border-border pl-4"><Skeleton className="h-9 w-24" /><Skeleton className="mt-2 h-4 w-40" /></div>
      </div>
      <div aria-hidden>
        <Skeleton className="mb-3 h-3 w-28" />
        <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-none border-b border-r border-border" />)}
        </div>
      </div>
      <section aria-hidden>
        <Skeleton className="h-3 w-32" />
        <div className="mt-3 flex items-end justify-between gap-4"><div><Skeleton className="h-8 w-52" /><Skeleton className="mt-2 h-4 w-72 max-w-full" /></div><Skeleton className="h-11 w-32" /></div>
        <div className="mt-6"><NovelGridSkeleton count={12} /></div>
      </section>
    </PageShell>
  );
}
