import { PageShell, Skeleton } from "@/components/ui/section";

type AccountLoadingVariant = "profile" | "settings" | "notifications" | "wallet";

const loadingLabel: Record<AccountLoadingVariant, string> = {
  profile: "กำลังเตรียมโปรไฟล์และสรุปการอ่าน",
  settings: "กำลังเตรียมการตั้งค่าบัญชีและการอ่าน",
  notifications: "กำลังตรวจสอบสถานะการแจ้งเตือน",
  wallet: "กำลังตรวจสอบสถานะระบบชำระเงิน",
};

function AccountHeaderSkeleton({ description = false }: { description?: boolean }) {
  return (
    <header>
      <Skeleton className="h-3 w-32" />
      <Skeleton className="mt-3 h-9 w-44" />
      {description ? <Skeleton className="mt-3 h-4 w-[min(520px,90%)]" /> : null}
    </header>
  );
}

export function AccountPageSkeleton({ variant }: { variant: AccountLoadingVariant }) {
  if (variant === "wallet") {
    return (
      <PageShell>
        <p role="status" className="sr-only">{loadingLabel[variant]}</p>
        <section className="mx-auto max-w-5xl space-y-6 py-5" aria-hidden>
          <header><Skeleton className="h-3 w-28" /><Skeleton className="mt-3 h-9 w-52" /><Skeleton className="mt-3 h-4 w-[min(520px,90%)]" /></header>
          <Skeleton className="h-60 w-full rounded-(--r-lg)" />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-56 rounded-(--r-lg)" />)}
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell className="space-y-6">
      <p role="status" className="sr-only">{loadingLabel[variant]}</p>
      <AccountHeaderSkeleton description={variant === "settings"} />

      {variant === "profile" ? (
        <div aria-hidden className="space-y-8">
          <section className="grid gap-6 py-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-center gap-4"><Skeleton className="h-16 w-16 rounded-full" /><div><Skeleton className="h-6 w-44" /><Skeleton className="mt-2 h-4 w-56" /><Skeleton className="mt-2 h-3 w-36" /></div></div>
            <div className="flex gap-2"><Skeleton className="h-11 w-24" /><Skeleton className="h-11 w-28" /></div>
          </section>
          <section>
            <div className="mb-3 flex items-center justify-between gap-3"><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-40" /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-16" />)}
            </div>
          </section>
        </div>
      ) : null}

      {variant === "settings" ? (
        <div aria-hidden className="divide-y divide-border">
          {Array.from({ length: 4 }, (_, index) => (
            <section key={index} className="grid gap-5 py-6 lg:grid-cols-[240px_1fr]">
              <div><Skeleton className="h-6 w-36" /><Skeleton className="mt-2 h-4 w-48" /></div>
              <div><Skeleton className="h-11 w-full" /><Skeleton className="mt-3 h-11 w-[72%]" /></div>
            </section>
          ))}
        </div>
      ) : null}

      {variant === "notifications" ? (
        <section aria-hidden className="flex gap-4 py-3">
          <Skeleton className="h-6 w-6 shrink-0" />
          <div className="w-full"><Skeleton className="h-6 w-64 max-w-full" /><Skeleton className="mt-3 h-4 w-full" /><Skeleton className="mt-2 h-4 w-[76%]" /><Skeleton className="mt-5 h-11 w-40" /></div>
        </section>
      ) : null}
    </PageShell>
  );
}
