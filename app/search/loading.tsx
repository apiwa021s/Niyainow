import { NovelGridSkeleton } from "@/components/browse/novel-grid-skeleton";
import { PageShell, Skeleton } from "@/components/ui/section";

export default function SearchLoading() {
  return <PageShell><p role="status" className="sr-only">กำลังเตรียมหน้าค้นหา</p><div className="border-b border-border pb-5"><Skeleton className="h-3 w-24" /><Skeleton className="mt-3 h-9 w-56" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></div><div className="mt-6 flex gap-2"><Skeleton className="h-12 flex-1" /><Skeleton className="h-12 w-28" /></div><Skeleton className="mt-10 h-7 w-48" /><div className="mt-4"><NovelGridSkeleton count={6} /></div></PageShell>;
}
