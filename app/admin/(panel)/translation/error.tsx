"use client";

import { CircleAlert, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button, ButtonLink } from "@/components/ui/button";

export default function TranslationError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("Translation Studio render failed", error);
  }, [error]);

  return (
    <section className="grid min-h-80 place-items-center rounded-[18px] border border-destructive/25 bg-card p-6 text-center shadow-[var(--sh-1)]">
      <div className="grid max-w-lg justify-items-center">
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive"><CircleAlert className="h-6 w-6" /></span>
        <h1 className="mt-4 text-xl font-bold">เปิด AI Translation Studio ไม่สำเร็จ</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">ข้อมูลของคุณยังอยู่ครบ อาจเป็นปัญหาการเชื่อมต่อชั่วคราว ลองโหลดส่วนนี้ใหม่หรือกลับไปหน้าหลักหลังบ้าน</p>
        {error.digest ? <p className="mt-2 text-xs text-muted-foreground">รหัสอ้างอิง: {error.digest}</p> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={retry}><RefreshCw className="h-4 w-4" />ลองอีกครั้ง</Button>
          <ButtonLink href="/admin" variant="outline">กลับหน้าหลังบ้าน</ButtonLink>
        </div>
      </div>
    </section>
  );
}
