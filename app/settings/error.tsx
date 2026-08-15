"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function SettingsError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="SETTINGS / RECOVERY"
      title="เปิดการตั้งค่าไม่ได้"
      description="ข้อมูลบัญชีหรือแผงตั้งค่าบางส่วนอาจโหลดไม่ครบ ค่าการอ่านที่บันทึกไว้บนอุปกรณ์ไม่ได้ถูกลบ"
      secondaryHref="/profile"
      secondaryLabel="กลับโปรไฟล์"
    />
  );
}
