"use client";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <PageShell className="grid min-h-[60vh] place-items-center text-center">
      <div>
        <h1 className="text-3xl font-semibold">มีบางอย่างผิดพลาด</h1>
        <p className="mt-2 text-muted-foreground">ลองโหลดหน้านี้ใหม่อีกครั้ง</p>
        <Button className="mt-5" onClick={reset}>ลองใหม่</Button>
      </div>
    </PageShell>
  );
}
