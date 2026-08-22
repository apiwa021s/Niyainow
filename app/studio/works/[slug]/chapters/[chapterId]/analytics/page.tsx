import type { Metadata } from "next";
import { ArrowLeft, BarChart3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getStudioChapterEarnings } from "@/services/studio-analytics-service";
import { getWriterChapterEditorData, getWriterStoryBySlug } from "@/services/studio-service";

export const metadata: Metadata = { title: "สถิติตอน" };
const money = new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" });

export default async function ChapterAnalyticsPage({ params }: { params: Promise<{ slug: string; chapterId: string }> }) {
  const { slug, chapterId } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}/chapters/${chapterId}/analytics`);
  let story;
  let chapter;
  try {
    [story, chapter] = await Promise.all([getWriterStoryBySlug(user.id, slug), getWriterChapterEditorData(user.id, chapterId)]);
    if (chapter.novelId !== story.id) notFound();
  } catch { notFound(); }
  const earnings = await getStudioChapterEarnings(user.id, chapterId);
  return <div><Link href={`/studio/works/${slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-(--text-secondary)"><ArrowLeft className="h-4 w-4" aria-hidden />{story.title}</Link><StudioPageHeader eyebrow={`EP.${chapter.chapterNumber}`} title={chapter.title} description="สถิติจากธุรกรรมจริงของตอนนี้" /><div className="grid gap-3 sm:grid-cols-2"><section className="rounded-[8px] border border-border bg-card p-5"><p className="text-xs text-(--text-tertiary)">รายได้สุทธิ</p><p className="mt-2 text-2xl font-semibold">{money.format((earnings?.amountMinor ?? 0) / 100)}</p></section><section className="rounded-[8px] border border-border bg-card p-5"><p className="text-xs text-(--text-tertiary)">รายการรายได้</p><p className="mt-2 text-2xl font-semibold">{earnings?.transactionCount ?? 0}</p></section></div><section className="mt-4 flex gap-3 rounded-[8px] border border-dashed border-border bg-card p-5"><BarChart3 className="h-5 w-5 shrink-0 text-brand-primary" aria-hidden /><div><h2 className="font-semibold">Reader funnel ยังไม่แสดงใน V1</h2><p className="mt-1 text-sm leading-6 text-(--text-secondary)">ระบบยังไม่เก็บ event รายบุคคลเพื่อสร้าง funnel โดยไม่จำเป็น เมื่อมี aggregate pipeline ที่รักษาความเป็นส่วนตัวแล้วจึงจะแสดงข้อมูลส่วนนี้</p></div></section></div>;
}
