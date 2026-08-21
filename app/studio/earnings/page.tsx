import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { EarningsBalanceCard } from "@/components/studio/earnings/earnings-balance-card";
import { EarningsChart } from "@/components/studio/earnings/earnings-chart";
import { EarningsEmptyState } from "@/components/studio/earnings/earnings-empty-state";
import { EarningsSummaryCards } from "@/components/studio/earnings/earnings-summary-cards";
import { RevenueShareCard } from "@/components/studio/earnings/revenue-share-card";
import { StoryEarningsList } from "@/components/studio/earnings/story-earnings-list";
import { ResumeWritingCard } from "@/components/studio/writer-studio-components";
import {
  creatorEarningsAccount,
  creatorEarningsDaily,
  creatorEarningsHeroTotal,
  currentRevenueContract,
  hasAnyPaidChapters,
  hasAnyUnlocks,
  revenueContractHistory,
  storyEarnings,
} from "@/components/studio/mock-earnings";
import { StudioPageHeader } from "@/components/studio/studio-ui";

export const metadata: Metadata = { title: "รายได้" };

/**
 * The writer never has to read "ledger," "settlement," or "revenue
 * attribution" here (spec §42) — every label on this page is the plain word
 * a creator would actually use: รายได้, กำลังตรวจสอบ, พร้อมรับเงิน,
 * ส่วนแบ่งของคุณ.
 */
export default function StudioEarningsPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow={`งวดปัจจุบัน · ${creatorEarningsAccount.currentPeriodLabel}`}
        title="รายได้"
        description="รายได้ทุกบาทมาจากตอนที่มีคนปลดล็อกจริง คำนวณตามส่วนแบ่งรายได้ของคุณ ตรวจสอบย้อนกลับได้ทุกรายการ"
        action={
          <Link
            href="/studio/earnings/transactions"
            className="tap-target inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
          >
            ดูรายการรายได้ทั้งหมด
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        }
      />

      {!hasAnyPaidChapters ? (
        <EarningsEmptyState hasPaidChapters={false} />
      ) : (
        <div className="grid gap-4">
          <EarningsBalanceCard
            heroTotal={creatorEarningsHeroTotal}
            monthlyEarnings={creatorEarningsAccount.monthlyEarnings}
            monthlyEarningsChange={creatorEarningsAccount.monthlyEarningsChange}
            pendingAmount={creatorEarningsAccount.pendingAmount}
            availableAmount={creatorEarningsAccount.availableAmount}
            lifetimeEarnings={creatorEarningsAccount.lifetimeEarnings}
          />

          {!hasAnyUnlocks ? (
            <EarningsEmptyState hasPaidChapters />
          ) : (
            <>
              <EarningsSummaryCards
                monthlyEarnings={creatorEarningsAccount.monthlyEarnings}
                monthlyEarningsChange={creatorEarningsAccount.monthlyEarningsChange}
                monthlyUnlocks={creatorEarningsAccount.monthlyUnlocks}
                monthlyUnlocksChange={creatorEarningsAccount.monthlyUnlocksChange}
                uniqueBuyers={creatorEarningsAccount.uniqueBuyers}
                lifetimeEarnings={creatorEarningsAccount.lifetimeEarnings}
              />

              <EarningsChart daily={creatorEarningsDaily} />

              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <StoryEarningsList stories={storyEarnings} />
                <div className="grid content-start gap-4">
                  <RevenueShareCard current={currentRevenueContract} history={revenueContractHistory} />
                  <ResumeWritingCard compactMode />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
