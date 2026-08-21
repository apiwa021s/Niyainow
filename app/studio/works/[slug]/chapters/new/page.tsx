import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ChapterEditor } from "@/components/studio/editor/chapter-editor";
import { studioChapters, studioWorks } from "@/components/studio/mock-data";

export const metadata: Metadata = { title: "เขียนตอนใหม่" };

export default async function NewChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  const chapters = work.slug === "reborn-as-a-warlord" ? studioChapters : [];
  const nextNumber = chapters.length ? Math.max(...chapters.map((chapter) => chapter.number)) + 1 : 1;

  return (
    <ChapterEditor
      work={work}
      chapterNumber={nextNumber}
      initialTitle=""
      initialContent=""
      serverSavedAt={0}
    />
  );
}
