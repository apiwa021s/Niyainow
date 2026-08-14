import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Eye } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChapterEditorView } from "@/components/admin/views/chapter-editor-view";
import { ButtonLink } from "@/components/ui/button";
import { getAdminChapter, getAdminNovel } from "@/services/admin-service";

type Props = { params: Promise<{ slug: string; chapter: string }> };
export const metadata: Metadata = { title: "แก้ไขตอน" };

export default async function EditChapterPage({ params }: Props) {
  const { slug, chapter: number } = await params;
  const [novel, chapter] = await Promise.all([getAdminNovel(slug), getAdminChapter(slug, number)]);
  if (!novel || !chapter) notFound();
  return <><AdminPageHeader title={`ตอน ${chapter.chapterNumber}: ${chapter.title}`} description={`sortOrder ${chapter.sortOrder} · ${chapter.status}`} crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: novel.title, href: `/admin/novels/${novel.slug}` }, { label: "ตอน", href: `/admin/novels/${novel.slug}/chapters` }, { label: String(chapter.chapterNumber) }]} actions={<ButtonLink href={`/admin/novels/${novel.slug}/chapters/${chapter.chapterNumber}/preview`} variant="outline"><Eye className="h-4 w-4" />ตัวอย่าง</ButtonLink>} /><ChapterEditorView novel={novel} chapter={chapter} defaults={{ chapterNumber: chapter.chapterNumber, sortOrder: chapter.sortOrder }} /></>;
}
