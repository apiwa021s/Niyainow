import type { Metadata } from "next";
import { AdminPageHeader, StatCard } from "@/components/admin/admin-ui";
import { CoinsView } from "@/components/admin/views/coins-view";
import { getTransactionSummary } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "แพ็กเกจเหรียญ",
  description: "ตั้งราคาแพ็กเกจเติมเหรียญและกติกาการใช้เหรียญของทั้งเว็บ"
};

export default function AdminCoinsPage() {
  const summary = getTransactionSummary();

  return (
    <>
      <AdminPageHeader
        title="แพ็กเกจเหรียญ"
        description="ราคาต้องโปร่งใส — ผู้อ่านเห็นราคาต่อเหรียญก่อนตัดสินใจเสมอ"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แพ็กเกจเหรียญ" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="เหรียญที่ขายได้" value={summary.coinsSold} unit="เหรียญ" hint="จากธุรกรรมที่สำเร็จ" />
        <StatCard label="ยอดขายรวม" value={summary.grossTHB} unit="บาท" />
        <StatCard label="ยอดคืนเงิน" value={summary.refundTHB} unit="บาท" hint="ควรต่ำกว่า 2% ของยอดขาย" />
        <StatCard label="รอดำเนินการ" value={summary.pending} unit="รายการ" hint="ค้างเกิน 24 ชม. ให้ตรวจสอบ" />
      </div>

      <CoinsView />
    </>
  );
}
