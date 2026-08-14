import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChapterEditorView } from "@/components/admin/views/chapter-editor-view";
import { getAdminNovel } from "@/services/admin-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = getAdminNovel(slug);
  return { title: novel ? `เพิ่มตอนใหม่ — ${novel.thaiTitle}` : "ไม่พบนิยาย" };
}

export default async function AdminNewChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = getAdminNovel(slug);
  if (!novel) notFound();

  return (
    <>
      <AdminPageHeader
        title="เพิ่มตอนใหม่"
        description={`${novel.thaiTitle} — ระบบเติมเลขตอนถัดไปให้แล้ว แก้ได้ถ้าต้องการแทรกตอน`}
        crumbs={[
          { label: "หลังบ้าน", href: "/admin" },
          { label: "นิยาย", href: "/admin/novels" },
          { label: novel.thaiTitle, href: `/admin/novels/${novel.slug}` },
          { label: "ตอน", href: `/admin/novels/${novel.slug}/chapters` },
          { label: "เพิ่มตอนใหม่" }
        ]}
      />
      <ChapterEditorView novel={novel} />
    </>
  );
}
