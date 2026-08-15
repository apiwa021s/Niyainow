"use client";

import { RotateCcw, WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Button, ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";

export type RouteErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
};

function subscribeToConnection(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function connectionSnapshot() {
  return navigator.onLine;
}

function serverConnectionSnapshot() {
  return true;
}

export function RouteRecovery({
  retry,
  title,
  description,
  kicker = "SYSTEM / RECOVERY",
  secondaryHref = "/",
  secondaryLabel = "กลับหน้าแรก",
}: {
  retry: () => void;
  title: string;
  description: string;
  kicker?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  const isOnline = useSyncExternalStore(
    subscribeToConnection,
    connectionSnapshot,
    serverConnectionSnapshot,
  );
  const resolvedTitle = isOnline ? title : "ดูเหมือนอุปกรณ์นี้ออฟไลน์";
  const resolvedDescription = isOnline
    ? description
    : "เบราว์เซอร์รายงานว่าไม่มีการเชื่อมต่ออินเทอร์เน็ต หน้านี้ยังไม่ได้แก้ไขหรือลบข้อมูลของคุณ เมื่อกลับมาออนไลน์แล้วให้ลองโหลดอีกครั้ง";

  return (
    <PageShell className="grid min-h-[68vh] place-items-center">
      <section aria-labelledby="route-recovery-title" aria-live="polite" className="w-full max-w-2xl border-y border-border py-10 text-center">
        {!isOnline ? <WifiOff className="mx-auto mb-4 h-7 w-7 text-[var(--brand-emphasis)]" aria-hidden /> : null}
        <p className="editorial-kicker">{isOnline ? kicker : "OFFLINE / RECOVERY"}</p>
        <h1 id="route-recovery-title" className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">{resolvedTitle}</h1>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted-foreground">{resolvedDescription}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={retry}><RotateCcw className="h-4 w-4" />ลองอีกครั้ง</Button>
          <ButtonLink href={secondaryHref} variant="outline">{secondaryLabel}</ButtonLink>
        </div>
      </section>
    </PageShell>
  );
}
