import type { Metadata } from "next";
import { AdminPageHeader, StatCard } from "@/components/admin/admin-ui";
import { ReportsView } from "@/components/admin/views/reports-view";
import { adminReports } from "@/data/admin-data";

export const metadata: Metadata = {
  title: "รายงานปัญหา",
  description: "คิวตรวจสอบเนื้อหาและผู้ใช้ที่ถูกรายงาน"
};

export default async function AdminReportsPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string; q?: string; reason?: string }>;
}) {
  const query = await searchParams;

  const open = adminReports.filter((report) => report.status === "open").length;
  const reviewing = adminReports.filter((report) => report.status === "reviewing").length;
  const high = adminReports.filter((report) => report.priority === "high" && report.status !== "resolved").length;
  const resolved = adminReports.filter((report) => report.status === "resolved").length;

  return (
    <>
      <AdminPageHeader
        title="รายงานปัญหา"
        description="เรียงตามความเร่งด่วน — เรื่องลิขสิทธิ์และการคุกคามต้องจัดการก่อนเสมอ"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "รายงานปัญหา" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ยังไม่ตรวจ" value={open} unit="รายการ" hint="เป้าหมาย: รับเรื่องภายใน 2 ชม." />
        <StatCard label="กำลังตรวจ" value={reviewing} unit="รายการ" />
        <StatCard label="ด่วนมาก" value={high} unit="รายการ" hint="ลิขสิทธิ์ / คุกคาม" />
        <StatCard label="ปิดแล้วเดือนนี้" value={resolved} unit="รายการ" />
      </div>

      <ReportsView initialQuery={query} />
    </>
  );
}
