import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChapterImportView } from "@/components/admin/views/chapter-import-view";
import { getAdminNovel, getNextChapterDefaults } from "@/services/admin-service";

export const metadata: Metadata = { title: "นำเข้าหลายตอน" };

export default async function ImportChaptersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [novel, defaults] = await Promise.all([getAdminNovel(slug), getNextChapterDefaults(slug)]);
  if (!novel) notFound();
  return (
    <>
      <AdminPageHeader
        title="นำเข้าหลายตอน"
        description={`เพิ่มหลายตอนให้ “${novel.title}” ในครั้งเดียว และตรวจสอบข้อมูลก่อนบันทึก`}
        crumbs={[
          { label: "หลังบ้าน", href: "/admin" },
          { label: "นิยาย", href: "/admin/novels" },
          { label: novel.title, href: `/admin/novels/${novel.slug}` },
          { label: "ตอน", href: `/admin/novels/${novel.slug}/chapters` },
          { label: "นำเข้าหลายตอน" },
        ]}
      />
      <ChapterImportView novel={novel} defaults={defaults} />
    </>
  );
}
