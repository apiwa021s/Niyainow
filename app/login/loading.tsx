import { PageShell, Skeleton } from "@/components/ui/section";

export default function LoginLoading() {
  return (
    <PageShell className="max-w-6xl py-4 sm:py-7 lg:py-10" aria-busy="true" aria-label="กำลังโหลดหน้าเข้าสู่ระบบ">
      <section className="overflow-hidden rounded-[8px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="grid lg:min-h-[620px] lg:grid-cols-[minmax(0,1.05fr)_minmax(390px,0.95fr)]">
          <div className="order-2 bg-[var(--brand-ink)] p-5 sm:p-8 lg:order-1 lg:p-10">
            <Skeleton className="h-11 w-44 bg-white/15" />
            <Skeleton className="mt-9 h-4 w-28 bg-white/15" />
            <Skeleton className="mt-3 h-9 w-full max-w-md bg-white/15" />
            <Skeleton className="mt-3 h-5 w-full max-w-lg bg-white/10" />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="border-t border-white/10 pt-4">
                  <Skeleton className="h-4 w-36 bg-white/15" />
                  <Skeleton className="mt-2 h-3 w-full bg-white/10" />
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 flex items-center justify-center bg-[var(--bg-elevated)] p-3 sm:p-8 lg:order-2 lg:p-10">
            <div className="w-full max-w-lg rounded-[8px] border border-border bg-card p-5 sm:p-6">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-3 h-7 w-64" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <Skeleton className="mt-7 h-12 w-full" />
              <Skeleton className="mt-5 h-4 w-3/4" />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
