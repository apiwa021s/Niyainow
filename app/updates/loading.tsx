import { PageShell, Skeleton } from "@/components/ui/section";

export default function UpdatesLoading() {
  return <PageShell><p role="status" className="sr-only">กำลังโหลดตอนใหม่ล่าสุด</p><div className="py-2"><Skeleton className="h-3 w-32" /><Skeleton className="mt-3 h-9 w-52" /><Skeleton className="mt-2 h-4 w-80 max-w-full" /></div><div className="mt-5 flex gap-2"><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-28" /></div><div className="mt-6 divide-y divide-border">{Array.from({ length: 8 }, (_, index) => <div key={index} className="flex gap-3 py-3"><Skeleton className="h-[78px] w-[52px]" /><div className="flex-1"><Skeleton className="h-3 w-20" /><Skeleton className="mt-3 h-4 w-1/2" /><Skeleton className="mt-2 h-3 w-2/3" /></div></div>)}</div></PageShell>;
}
