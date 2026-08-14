import type { Metadata } from "next";
import { AdminLoginView } from "@/components/admin/views/admin-login-view";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบหลังบ้าน",
  description: "หน้าเข้าสู่ระบบสำหรับทีมงาน NiyaiNow",
  robots: { index: false, follow: false }
};

export default function AdminLoginPage() {
  return <AdminLoginView />;
}
