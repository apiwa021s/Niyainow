import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductionChapterEditor } from "@/components/studio/editor/production-chapter-editor";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterStoryBySlug, listWriterChapters } from "@/services/studio-service";

export const metadata: Metadata = { title: "เขียนตอนใหม่" };

export default async function NewChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}/chapters/new`);
  let story;
  try { story = await getWriterStoryBySlug(user.id, slug); } catch { notFound(); }
  const chapters = await listWriterChapters(user.id, story.id);
  const nextNumber = chapters.length ? Math.max(...chapters.map((chapter) => chapter.chapterNumber)) + 1 : 1;
  return <ProductionChapterEditor story={{ id: story.id, slug: story.slug, title: story.title, heatLevel: story.heatLevel }} chapterNumber={nextNumber} />;
}
