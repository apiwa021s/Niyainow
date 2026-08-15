"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function NotificationsError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="NOTIFICATIONS / RECOVERY"
      title="เปิดสถานะการแจ้งเตือนไม่ได้"
      description="สถานะรายการติดตามที่ใช้ประกอบหน้านี้อาจโหลดไม่ครบชั่วคราว ลองดึงข้อมูลใหม่อีกครั้ง"
      secondaryHref="/library/following"
      secondaryLabel="ดูเรื่องที่ติดตาม"
    />
  );
}
