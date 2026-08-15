"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function WalletError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="ACCOUNT / RECOVERY"
      title="เปิดหน้าสถานะการชำระเงินไม่ได้"
      description="การตรวจสอบบัญชีสำหรับหน้านี้ไม่สำเร็จชั่วคราว เว็บไซต์ยังไม่ได้ทำรายการเรียกเก็บเงินใด ๆ"
      secondaryHref="/profile"
      secondaryLabel="กลับโปรไฟล์"
    />
  );
}
