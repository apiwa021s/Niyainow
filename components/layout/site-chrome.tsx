"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** หน้าอ่านมี chrome ของตัวเอง — ซ่อน header/footer/bottom nav ของเว็บ (ส่วนที่ 6.2, 6.7) */
export function isReaderRoute(pathname: string | null) {
  return /^\/novel\/[^/]+\/chapter\/[^/]+/.test(pathname ?? "");
}

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isReaderRoute(pathname)) return null;
  return <>{children}</>;
}
