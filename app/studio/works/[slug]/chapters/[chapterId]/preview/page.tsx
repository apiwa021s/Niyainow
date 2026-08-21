import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChapterPreview } from "@/components/studio/preview/chapter-preview";
import { studioChapters, studioWorks } from "@/components/studio/mock-data";

export const metadata: Metadata = { title: "ตัวอย่างตอน" };

export default async function ChapterPreviewPage({ params }: { params: Promise<{ slug: string; chapterId: string }> }) {
  const { slug, chapterId } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  const chapters = work.slug === "reborn-as-a-warlord" ? studioChapters : [];
  const chapter = chapters.find((item) => item.number === Number(chapterId));
  const fallbackTitle = chapter && chapter.title !== "(ยังไม่ตั้งชื่อ)" ? chapter.title : "";

  return (
    <ChapterPreview
      storySlug={work.slug}
      chapterKey={chapterId}
      novelTitle={work.title}
      chapterNumber={Number(chapterId)}
      fallbackTitle={fallbackTitle}
      fallbackContent=""
    />
  );
}
