"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function GenreError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="GENRE / RECOVERY"
      title="เปิดหน้านิยายแนวนี้ไม่ได้"
      description="รายการเรื่องเด่น เรื่องที่เพิ่งอัปเดต หรือผลลัพธ์ของแนวนี้อาจโหลดไม่ครบ ลองดึงข้อมูลใหม่อีกครั้ง"
      secondaryHref="/genres"
      secondaryLabel="ดูแนวนิยายทั้งหมด"
    />
  );
}
