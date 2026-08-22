import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StudioPageHeader } from "@/components/studio/studio-ui";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterStoryBySlug, listWriterChapters } from "@/services/studio-service";

export const metadata: Metadata = { title: "การเข้าถึงและราคา" };

export default async function StoryPricingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}/pricing`);
  let story;
  try {
    story = await getWriterStoryBySlug(user.id, slug);
  } catch { notFound(); }
  const chapters = await listWriterChapters(user.id, story.id);
  return <><Link href={`/studio/works/${slug}`} className="inline-flex min-h-11 items-center gap-1.5 text-sm text-(--text-secondary)"><ArrowLeft className="h-4 w-4" aria-hidden />{story.title}</Link><StudioPageHeader eyebrow="STORY / ACCESS" title="การเข้าถึงและราคา" description="ราคาอยู่ที่แต่ละตอนและเปลี่ยนได้จากหน้าแก้ไขตอน Backend ตรวจเงื่อนไขทุกครั้งก่อนเผยแพร่" /><section className="overflow-hidden rounded-[8px] border border-border bg-card">{chapters.length ? <ul className="divide-y divide-border">{chapters.map((chapter) => <li key={chapter.id} className="flex items-center justify-between gap-4 px-5 py-4"><div><p className="font-semibold">EP.{chapter.chapterNumber} · {chapter.title}</p><p className="mt-1 text-xs text-(--text-tertiary)">{chapter.status}</p></div><div className="text-right"><p className="font-semibold">{chapter.accessMode === "free" ? "อ่านฟรี" : chapter.accessMode === "paid" ? `${chapter.coinPrice} Coins` : chapter.accessMode === "early_access" ? "สมาชิกอ่านก่อน" : "สมาชิกเท่านั้น"}</p><Link href={`/studio/works/${slug}/chapters/${chapter.id}/edit`} className="text-xs text-[var(--brand-emphasis)] hover:underline">แก้ไขตอน</Link></div></li>)}</ul> : <p className="p-6 text-sm text-(--text-secondary)">ยังไม่มีตอนสำหรับตั้งราคา</p>}</section></>;
}
