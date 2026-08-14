import type { Metadata } from "next";
import { AdminPageHeader, StatCard } from "@/components/admin/admin-ui";
import { PayoutsView } from "@/components/admin/views/payouts-view";
import { adminPayouts } from "@/data/admin-data";
import { getPendingPayoutTotal } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "จ่ายรายได้ทีมแปล",
  description: "อนุมัติและติดตามคำขอถอนรายได้ของทีมแปล"
};

export default async function AdminPayoutsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  const pending = adminPayouts.filter((payout) => payout.status === "pending").length;
  const paidTotal = adminPayouts
    .filter((payout) => payout.status === "paid")
    .reduce((total, payout) => total + payout.amountTHB, 0);

  return (
    <>
      <AdminPageHeader
        title="จ่ายรายได้ทีมแปล"
        description="อัตราแลกเปลี่ยนมาตรฐาน 2 เหรียญ = 1 บาท — ตรวจยอดกับรายงานรายได้ก่อนอนุมัติทุกครั้ง"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "จ่ายรายได้ทีมแปล" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="คำขอรออนุมัติ" value={pending} unit="คำขอ" hint="เป้าหมาย: ตอบภายใน 3 วันทำการ" />
        <StatCard label="ยอดที่รออนุมัติ" value={getPendingPayoutTotal()} unit="บาท" />
        <StatCard label="โอนแล้วปีนี้" value={paidTotal} unit="บาท" />
        <StatCard label="ทีมแปลที่มีรายได้" value={adminPayouts.length} unit="ทีม" />
      </div>

      <PayoutsView initialStatus={status} />
    </>
  );
}
