import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/lib/auth/dal";
import { getPendingWork } from "@/services/admin-service";
import AdminLoading from "./loading";

export const metadata: Metadata = {
  title: {
    default: "ระบบหลังบ้าน",
    template: "%s | หลังบ้าน NiyaiThai"
  },
  // หน้าหลังบ้านไม่ควรถูกเก็บเข้า index ของ search engine
  robots: { index: false, follow: false }
};

async function AdminPanel({ children }: { children: React.ReactNode }) {
  const [user, pending] = await Promise.all([requireAdmin("/admin"), getPendingWork()]);

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role as "EDITOR" | "ADMIN" }}
      pending={{
        submissions: pending.submissions,
        reports: pending.reports,
        comments: pending.comments,
        payouts: pending.payouts
      }}
    >
      {children}
    </AdminShell>
  );
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main className="min-h-screen p-4 sm:p-6"><AdminLoading /></main>}>
      <AdminPanel>{children}</AdminPanel>
    </Suspense>
  );
}
