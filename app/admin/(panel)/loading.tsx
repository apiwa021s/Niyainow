import { Skeleton } from "@/components/ui/section";

/** โครงร่างระหว่างโหลด — ใช้สัดส่วนเดียวกับหน้าจริงเพื่อไม่ให้เลย์เอาต์กระตุก (ส่วนที่ 7) */
export default function AdminLoading() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Skeleton key={item} className="h-32 rounded-[16px]" />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="h-80 rounded-[16px]" />
        <Skeleton className="h-80 rounded-[16px]" />
      </div>
    </div>
  );
}
