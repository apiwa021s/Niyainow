"use client";

import { RouteRecovery, type RouteErrorBoundaryProps } from "@/components/interactive/route-recovery";

export default function LibraryError({ retry }: RouteErrorBoundaryProps) {
  return (
    <RouteRecovery
      retry={retry}
      kicker="LIBRARY / RECOVERY"
      title="เปิดชั้นหนังสือไม่ได้"
      description="รายการกำลังอ่าน ติดตาม หรือบันทึกในบัญชีอาจโหลดไม่ครบชั่วคราว การลองใหม่จะไม่ลบรายการเหล่านั้น"
      secondaryHref="/novels"
      secondaryLabel="ไปสำรวจนิยาย"
    />
  );
}
