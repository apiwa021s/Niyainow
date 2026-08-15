"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function HistoryError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="HISTORY / RECOVERY"
      title="เปิดประวัติการอ่านไม่ได้"
      description="ตำแหน่งอ่านล่าสุดและรายการที่เคยเปิดอาจโหลดไม่ครบชั่วคราว ลองดึงประวัติจากบัญชีใหม่อีกครั้ง"
      secondaryHref="/library"
      secondaryLabel="ไปชั้นหนังสือ"
    />
  );
}
