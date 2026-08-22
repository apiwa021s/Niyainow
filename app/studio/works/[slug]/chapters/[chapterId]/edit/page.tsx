import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductionChapterEditor } from "@/components/studio/editor/production-chapter-editor";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterChapterEditorData, getWriterStoryBySlug } from "@/services/studio-service";

export const metadata: Metadata = { title: "แก้ไขตอน" };

export default async function EditChapterPage({ params }: { params: Promise<{ slug: string; chapterId: string }> }) {
  const { slug, chapterId } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}/chapters/${chapterId}/edit`);
  let story;
  let chapter;
  try {
    [story, chapter] = await Promise.all([
      getWriterStoryBySlug(user.id, slug),
      getWriterChapterEditorData(user.id, chapterId),
    ]);
    if (chapter.novelId !== story.id) notFound();
  } catch { notFound(); }
  return <ProductionChapterEditor story={{ id: story.id, slug: story.slug, title: story.title, heatLevel: story.heatLevel }} chapterNumber={chapter.chapterNumber} initialChapter={chapter} />;
}
