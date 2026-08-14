import type { Metadata } from "next";

import { AdminLoginView } from "@/components/admin/views/admin-login-view";
import { safeRedirectPath } from "@/lib/auth/redirects";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบหลังบ้าน",
  description: "หน้าเข้าสู่ระบบสำหรับทีมงาน NiyaiNow",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = safeRedirectPath(params.callbackUrl, "/admin");
  return <AdminLoginView callbackUrl={callbackUrl} error={params.error} />;
}
