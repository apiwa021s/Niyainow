"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function ProfileError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="PROFILE / RECOVERY"
      title="เปิดโปรไฟล์ไม่ได้"
      description="ข้อมูลบัญชีและสรุปกิจกรรมการอ่านอาจโหลดไม่ครบชั่วคราว ลองดึงข้อมูลใหม่อีกครั้ง"
      secondaryHref="/library"
      secondaryLabel="ไปชั้นหนังสือ"
    />
  );
}
