import type { Metadata } from "next";
import { ArrowRight, CircleDollarSign, Clock3, Landmark, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { StatTile, StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getStudioEarnings, getStudioRevenueShare, listStudioEarningsByStory } from "@/services/studio-analytics-service";
import { getWriterProfileForUser } from "@/services/studio-service";

export const metadata: Metadata = { title: "รายได้" };
const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 });

export default async function StudioEarningsPage() {
  const user = await requireActiveUser("/studio/earnings");
  if (!(await getWriterProfileForUser(user.id))) redirect("/studio/profile");
  const [earnings, contract, stories] = await Promise.all([getStudioEarnings(user.id), getStudioRevenueShare(user.id), listStudioEarningsByStory(user.id)]);
  return <><StudioPageHeader eyebrow="EARNINGS" title="รายได้" description="ยอดทั้งหมดคำนวณจาก Creator Ledger ที่ตรวจสอบย้อนกลับได้" action={<Link href="/studio/earnings/transactions" className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--brand-emphasis)] hover:underline">ดูทุกรายการ<ArrowRight className="h-4 w-4" aria-hidden /></Link>} /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatTile icon={Clock3} label="กำลังตรวจสอบ" value={money.format(earnings.pendingMinor / 100)} tone="money" /><StatTile icon={WalletCards} label="พร้อมรับเงิน" value={money.format(earnings.availableMinor / 100)} tone="money" /><StatTile icon={Landmark} label="สำรอง" value={money.format(earnings.reservedMinor / 100)} tone="money" /><StatTile icon={CircleDollarSign} label="รายได้สะสม" value={money.format(earnings.lifetimeEarningsMinor / 100)} tone="money" /></div><div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]"><section className="overflow-hidden rounded-[8px] border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">รายได้ตามเรื่อง</h2></div>{stories.length ? <ul className="divide-y divide-border">{stories.map((story) => <li key={story.storyId} className="flex items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><p className="truncate font-semibold">{story.storyTitle}</p><p className="mt-1 text-xs text-(--text-tertiary)">{story.transactionCount} รายการ</p></div><p className="font-semibold tabular-nums">{money.format(story.amountMinor / 100)}</p></li>)}</ul> : <p className="p-6 text-sm text-(--text-secondary)">ยังไม่มีรายได้ เมื่อมีการปลดล็อกตอนหรือสมัคร Membership รายการจะปรากฏที่นี่</p>}</section><aside className="rounded-[8px] border border-border bg-card p-5"><p className="editorial-kicker">REVENUE SHARE</p>{contract ? <><p className="mt-3 text-2xl font-semibold">{(contract.creatorShareBasisPoints / 100).toFixed(0)}%</p><p className="mt-1 text-sm text-(--text-secondary)">ส่วนแบ่งของคุณ · {contract.type}</p><p className="mt-4 text-xs leading-5 text-(--text-tertiary)">รายการรายได้จะ snapshot อัตรานี้ ณ เวลาที่เกิดธุรกรรม</p></> : <p className="mt-3 text-sm leading-6 text-(--text-secondary)">ยังไม่มีสัญญาแบ่งรายได้ที่เปิดใช้งาน ตอนแบบ Paid จะเผยแพร่ไม่ได้จนกว่าทีมงานกำหนดสัญญา</p>}</aside></div></>;
}
