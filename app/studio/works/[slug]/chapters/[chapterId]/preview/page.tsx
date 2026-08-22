import type { Metadata } from "next";
import { ArrowLeft, Flame } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterChapterEditorData, getWriterStoryBySlug } from "@/services/studio-service";

export const metadata: Metadata = { title: "ตัวอย่างตอน" };

export default async function ChapterPreviewPage({ params }: { params: Promise<{ slug: string; chapterId: string }> }) {
  const { slug, chapterId } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}/chapters/${chapterId}/preview`);
  let story;
  let chapter;
  try {
    [story, chapter] = await Promise.all([getWriterStoryBySlug(user.id, slug), getWriterChapterEditorData(user.id, chapterId)]);
    if (chapter.novelId !== story.id) notFound();
  } catch { notFound(); }
  const heat = chapter.inheritStoryHeatLevel ? story.heatLevel : chapter.heatLevel;
  return <main id="main" className="min-h-dvh bg-[var(--read-bg)] text-[var(--read-text)]"><header className="sticky top-0 border-b border-[var(--read-border)] bg-[var(--read-bg)]/95 px-4 backdrop-blur"><div className="mx-auto flex min-h-14 max-w-[var(--read-measure)] items-center justify-between gap-3"><Link href={`/studio/works/${slug}/chapters/${chapterId}/edit`} className="inline-flex min-h-11 items-center gap-2 text-sm"><ArrowLeft className="h-4 w-4" aria-hidden />กลับไปแก้ไข</Link><span className="text-xs text-[var(--read-muted)]">ตัวอย่างสำหรับนักเขียน · ยังไม่ใช่สิทธิ์ Reader</span></div></header><article className="mx-auto max-w-[var(--read-measure)] px-5 py-10"><p className="text-sm font-semibold text-[var(--read-muted)]">EP.{chapter.chapterNumber}</p><h1 className="mt-2 text-[var(--read-title-size)] font-semibold leading-[var(--read-title-leading)]">{chapter.title}</h1>{heat ? <p className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--read-muted)]"><Flame className="h-4 w-4" aria-hidden />Heat {heat}</p> : null}<div className="mt-8 whitespace-pre-wrap font-[family-name:var(--read-family)] text-[length:var(--read-size)] leading-[var(--read-leading)]">{chapter.content || "ยังไม่มีเนื้อหาในตอนนี้"}</div></article></main>;
}
