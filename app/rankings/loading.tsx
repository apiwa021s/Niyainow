import { PageShell, Skeleton } from "@/components/ui/section";

export default function RankingsLoading() {
  return <PageShell><p role="status" className="sr-only">กำลังคำนวณอันดับนิยาย</p><div className="py-2"><Skeleton className="h-3 w-40" /><Skeleton className="mt-3 h-9 w-52" /><Skeleton className="mt-2 h-4 w-[min(560px,90%)]" /></div><div className="mt-6 grid gap-2 rounded-[8px] bg-muted/35 p-1 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16" />)}</div><div className="mt-7 grid gap-6 py-2 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="mx-auto w-40"><Skeleton className="aspect-[2/3]" /><Skeleton className="mt-2 h-4 w-4/5" /></div>)}</div></PageShell>;
}
