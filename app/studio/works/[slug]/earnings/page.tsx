import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getStudioStoryEarnings, listStudioEarningTransactions } from "@/services/studio-analytics-service";
import { getWriterStoryBySlug } from "@/services/studio-service";

export const metadata: Metadata = { title: "รายได้จากเรื่อง" };
const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export default async function StoryEarningsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}/earnings`);
  let story;
  try {
    story = await getWriterStoryBySlug(user.id, slug);
  } catch { notFound(); }
  const [summary, allTransactions] = await Promise.all([getStudioStoryEarnings(user.id, story.id), listStudioEarningTransactions(user.id, 100)]);
  const transactions = allTransactions.filter((item) => item.novelId === story.id);
  return <><Link href={`/studio/works/${slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-(--text-secondary)"><ArrowLeft className="h-4 w-4" aria-hidden />{story.title}</Link><StudioPageHeader eyebrow="STORY / EARNINGS" title="รายได้จากเรื่อง" description="คำนวณจาก Creator Ledger ของเรื่องนี้เท่านั้น" /><section className="rounded-[8px] border border-border bg-card p-5"><p className="text-xs text-(--text-tertiary)">รายได้สุทธิสะสม</p><p className="mt-2 text-3xl font-semibold tabular-nums">{money.format((summary?.amountMinor ?? 0) / 100)}</p><p className="mt-1 text-sm text-(--text-secondary)">{summary?.transactionCount ?? 0} รายการ</p></section><section className="mt-4 overflow-hidden rounded-[8px] border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">รายการล่าสุด</h2></div>{transactions.length ? <ul className="divide-y divide-border">{transactions.map((item) => <li key={item.id} className="flex items-center justify-between px-5 py-3 text-sm"><span>{item.type}</span><strong className={item.amountMinor < 0 ? "text-destructive" : "text-[var(--success)]"}>{money.format(item.amountMinor / 100)}</strong></li>)}</ul> : <p className="p-6 text-sm text-(--text-secondary)">ยังไม่มีรายได้จากเรื่องนี้</p>}</section></>;
}
