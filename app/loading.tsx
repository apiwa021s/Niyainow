import { PageShell, Skeleton } from "@/components/ui/section";

export default function Loading() {
  return (
    <PageShell className="space-y-4">
      <Skeleton className="h-64 w-full" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-52" />)}
      </div>
    </PageShell>
  );
}
