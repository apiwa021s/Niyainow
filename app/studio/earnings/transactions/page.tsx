import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { CreatorTransactionList } from "@/components/studio/earnings/creator-transaction-list";
import { creatorTransactions } from "@/components/studio/mock-earnings";
import { StudioPageHeader } from "@/components/studio/studio-ui";

export const metadata: Metadata = { title: "รายการรายได้" };

export default function StudioEarningsTransactionsPage() {
  return (
    <>
      <Link
        href="/studio/earnings"
        className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        รายได้
      </Link>

      <StudioPageHeader
        eyebrow="EARNINGS"
        title="รายการรายได้"
        description="ทุกครั้งที่มีคนปลดล็อกตอนของคุณ จะมีรายการที่นี่เสมอ รายการที่บันทึกแล้วจะไม่ถูกแก้ไขหรือลบ หากมีการคืนเงิน ระบบจะเพิ่มรายการปรับปรุงให้เห็นแยกต่างหาก"
      />

      <CreatorTransactionList transactions={creatorTransactions} />
    </>
  );
}
