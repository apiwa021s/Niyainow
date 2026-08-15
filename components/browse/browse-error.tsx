"use client";

import { RotateCcw } from "lucide-react";

import type { RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";
import { Button, ButtonLink } from "@/components/ui/button";
import { ErrorState, PageShell } from "@/components/ui/section";

export default function BrowseError({ retry }: RouteErrorBoundaryProps) {
  return (
    <PageShell>
      <ErrorState
        title="โหลดรายการไม่สำเร็จ"
        description="การเชื่อมต่อหรือแหล่งข้อมูลอาจมีปัญหาชั่วคราว ลองอีกครั้งได้โดยไม่เสียตัวกรองที่เลือกไว้"
        action={<div className="flex flex-wrap justify-center gap-2"><Button type="button" onClick={retry}><RotateCcw className="h-4 w-4" />ลองอีกครั้ง</Button><ButtonLink href="/" variant="outline">กลับหน้าแรก</ButtonLink></div>}
      />
    </PageShell>
  );
}
