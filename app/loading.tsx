import { PageShell, Skeleton } from "@/components/ui/section";

export default function Loading() {
  return (
    <PageShell className="max-w-5xl">
      <p role="status" className="sr-only">กำลังเตรียมเนื้อหา</p>
      <div className="border-y border-border py-8 sm:py-10">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-9 w-[min(420px,80%)]" />
        <Skeleton className="mt-3 h-4 w-[min(620px,95%)]" />
        <Skeleton className="mt-2 h-4 w-[min(520px,85%)]" />
      </div>

      <div className="mt-10 divide-y divide-border border-y border-border">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="grid gap-4 py-6 sm:grid-cols-[180px_1fr]">
            <Skeleton className="h-5 w-32" />
            <div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-3 h-4 w-[88%]" />
              <Skeleton className="mt-3 h-4 w-[64%]" />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
