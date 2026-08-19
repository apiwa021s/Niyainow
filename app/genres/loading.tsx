import { InkLogoLoader } from "@/components/ui/ink-logo-loader";
import { PageShell, Skeleton } from "@/components/ui/section";

export default function GenresLoading() {
  return (
    <PageShell className="space-y-7">
      <InkLogoLoader />
      <p role="status" className="sr-only">กำลังโหลดหมวดหมู่นิยาย</p>
      <header aria-hidden className="py-2 sm:py-3">
        <Skeleton className="h-3 w-44" />
        <Skeleton className="mt-3 h-9 w-60 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[min(560px,90%)]" />
      </header>
      <ul aria-hidden className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }, (_, index) => (
          <li key={index} className="min-h-40 rounded-[8px] bg-card/70 p-4 sm:min-h-48 sm:p-5">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="mt-5 h-6 w-36" />
            <Skeleton className="mt-3 h-3 w-10/12" />
            <Skeleton className="mt-2 h-3 w-7/12" />
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
