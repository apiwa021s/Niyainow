import type { Metadata } from "next";
import { AdminPageHeader, Panel, StatCard } from "@/components/admin/admin-ui";
import { RankedBars } from "@/components/admin/charts";
import { TransactionsView } from "@/components/admin/views/transactions-view";
import { getRevenueByMethod, getTransactionSummary, type TransactionQuery } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "ธุรกรรม",
  description: "ตรวจสอบการเติมเหรียญ การใช้เหรียญ และการคืนเงินทั้งหมด"
};

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<TransactionQuery> }) {
  const query = await searchParams;
  const summary = getTransactionSummary();
  const byMethod = getRevenueByMethod();

  return (
    <>
      <AdminPageHeader
        title="ธุรกรรม"
        description="ทุกรายการเงินเข้า-ออกของระบบเหรียญ พร้อมคำสั่งคืนเงินรายรายการ"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ธุรกรรม" }]}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ยอดเงินเข้า" value={summary.grossTHB} unit="บาท" hint="เฉพาะรายการที่สำเร็จ" />
        <StatCard label="เหรียญที่ขายได้" value={summary.coinsSold} unit="เหรียญ" />
        <StatCard label="รอดำเนินการ" value={summary.pending} unit="รายการ" />
        <StatCard label="ล้มเหลว" value={summary.failed} unit="รายการ" hint="ส่วนใหญ่มาจากบัตรถูกปฏิเสธ" />
      </div>

      <Panel title="ยอดเติมแยกตามช่องทางชำระเงิน" description="ใช้ตัดสินใจว่าจะเจรจาค่าธรรมเนียมกับเจ้าไหนก่อน" className="mb-4">
        <RankedBars data={byMethod} unit="บาท" />
      </Panel>

      <TransactionsView initialQuery={query} />
    </>
  );
}
