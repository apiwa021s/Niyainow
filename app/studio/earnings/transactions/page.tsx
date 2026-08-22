import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { listStudioEarningTransactions } from "@/services/studio-analytics-service";

export const metadata: Metadata = { title: "รายการรายได้" };
const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });
const date = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default async function StudioEarningsTransactionsPage() {
  const user = await requireActiveUser("/studio/earnings/transactions");
  const transactions = await listStudioEarningTransactions(user.id, 100);
  return <><Link href="/studio/earnings" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"><ArrowLeft className="h-4 w-4" aria-hidden />รายได้</Link><StudioPageHeader eyebrow="EARNINGS" title="รายการรายได้" description="รายการจาก Creator Ledger จะไม่ถูกแก้ไขหรือลบ การคืนเงินแสดงเป็นรายการติดลบแยกต่างหาก" /><section className="overflow-x-auto rounded-[8px] border border-border bg-card">{transactions.length ? <table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b border-border bg-muted/50 text-xs text-(--text-secondary)"><tr><th className="px-4 py-3">วันที่</th><th className="px-4 py-3">ประเภท</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3 text-right">จำนวน</th></tr></thead><tbody className="divide-y divide-border">{transactions.map((item) => <tr key={item.id}><td className="px-4 py-3">{date.format(item.createdAt)}</td><td className="px-4 py-3">{item.type}</td><td className="px-4 py-3">{item.status}</td><td className={item.amountMinor < 0 ? "px-4 py-3 text-right font-semibold tabular-nums text-destructive" : "px-4 py-3 text-right font-semibold tabular-nums text-[var(--success)]"}>{money.format(item.amountMinor / 100)}</td></tr>)}</tbody></table> : <p className="p-6 text-sm text-(--text-secondary)">ยังไม่มีรายการรายได้</p>}</section></>;
}
