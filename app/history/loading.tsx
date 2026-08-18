import { PageShell, Skeleton } from "@/components/ui/section";

export default function HistoryLoading() {
  return (
    <PageShell>
      <p role="status" className="sr-only">กำลังเตรียมประวัติการอ่าน</p>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-9 w-48" />
      <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-11 w-24" />)}
      </div>
      <div className="mt-6 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28" />)}
      </div>
    </PageShell>
  );
}
