"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function ErrorPage({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      title="หน้านี้ยังเปิดไม่ได้"
      description="การเชื่อมต่อหรือข้อมูลบางส่วนอาจมีปัญหาชั่วคราว ลองโหลดเนื้อหาอีกครั้งโดยไม่เสียตำแหน่งที่กำลังดู"
    />
  );
}
