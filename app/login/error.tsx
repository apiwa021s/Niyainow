"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { BrandWordmark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { ErrorState, PageShell } from "@/components/ui/section";

export default function LoginError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Login page render failed", error);
  }, [error]);

  return (
    <PageShell className="grid min-h-[70dvh] max-w-3xl place-items-center py-8">
      <div className="w-full">
        <div className="mb-5 text-center">
          <BrandWordmark className="text-2xl" />
        </div>
        <ErrorState
          title="เปิดหน้าเข้าสู่ระบบไม่สำเร็จ"
          description="การเชื่อมต่ออาจมีปัญหาชั่วคราว ลองโหลดหน้าอีกครั้งได้โดยข้อมูลของคุณจะไม่สูญหาย"
          action={(
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={reset}>
                <RefreshCw className="h-4 w-4" aria-hidden />
                ลองอีกครั้ง
              </Button>
              <Link href="/" className="inline-flex min-h-11 items-center rounded-[6px] px-4 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                กลับหน้าหลัก
              </Link>
            </div>
          )}
        />
      </div>
    </PageShell>
  );
}
