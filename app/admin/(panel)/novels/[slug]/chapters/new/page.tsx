import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChapterEditorView } from "@/components/admin/views/chapter-editor-view";
import { getAdminNovel, getNextChapterDefaults } from "@/services/admin-service";

export const metadata: Metadata = { title: "เพิ่มตอน" };

export default async function NewChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [novel, defaults] = await Promise.all([getAdminNovel(slug), getNextChapterDefaults(slug)]);
  if (!novel) notFound();
  return <><AdminPageHeader title="เพิ่มตอน" description={novel.title} crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย", href: "/admin/novels" }, { label: novel.title, href: `/admin/novels/${novel.slug}` }, { label: "ตอน", href: `/admin/novels/${novel.slug}/chapters` }, { label: "เพิ่มตอน" }]} /><ChapterEditorView novel={novel} defaults={defaults} /></>;
}
