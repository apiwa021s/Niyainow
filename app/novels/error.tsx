"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function NovelsError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="EXPLORE / RECOVERY"
      title="เปิดหน้าสำรวจนิยายไม่ได้"
      description="รายการคัดสรรหรือผลลัพธ์จากคลังอาจโหลดไม่ครบชั่วคราว ลองดึงข้อมูลใหม่อีกครั้ง"
      secondaryHref="/"
      secondaryLabel="กลับหน้าแรก"
    />
  );
}
