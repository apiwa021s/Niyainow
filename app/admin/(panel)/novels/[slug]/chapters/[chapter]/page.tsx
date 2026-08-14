import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChapterEditorView } from "@/components/admin/views/chapter-editor-view";
import { ButtonLink } from "@/components/ui/button";
import { getAdminChapter, getAdminNovel } from "@/services/admin-service";
import { getChapter } from "@/services/novel-service";

type Params = Promise<{ slug: string; chapter: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug, chapter } = await params;
  const novel = getAdminNovel(slug);
  return { title: novel ? `แก้ไขตอนที่ ${chapter} — ${novel.thaiTitle}` : "ไม่พบตอน" };
}

export default async function AdminEditChapterPage({ params }: { params: Params }) {
  const { slug, chapter } = await params;
  const number = Number(chapter);
  const novel = getAdminNovel(slug);
  const adminChapter = Number.isFinite(number) ? getAdminChapter(slug, number) : undefined;
  if (!novel || !adminChapter) notFound();

  // เนื้อหาตอนอยู่ในชุดข้อมูลฝั่งผู้อ่าน — ดึงมาเติมในกล่องแก้ไข
  const readerChapter = getChapter(slug, number);

  return (
    <>
      <AdminPageHeader
        title={`ตอนที่ ${adminChapter.number}: ${adminChapter.title}`}
        description={`${novel.thaiTitle} — แก้ไขล่าสุด ${adminChapter.updatedAt} โดย ${adminChapter.editor}`}
        crumbs={[
          { label: "หลังบ้าน", href: "/admin" },
          { label: "นิยาย", href: "/admin/novels" },
          { label: novel.thaiTitle, href: `/admin/novels/${novel.slug}` },
          { label: "ตอน", href: `/admin/novels/${novel.slug}/chapters` },
          { label: `ตอนที่ ${adminChapter.number}` }
        ]}
        actions={
          <ButtonLink href={`/novel/${novel.slug}/chapter/${adminChapter.number}`} variant="outline">
            <ExternalLink className="h-4 w-4" />
            ดูหน้าเว็บจริง
          </ButtonLink>
        }
      />
      <ChapterEditorView novel={novel} chapter={adminChapter} body={readerChapter?.body ?? []} />
    </>
  );
}
