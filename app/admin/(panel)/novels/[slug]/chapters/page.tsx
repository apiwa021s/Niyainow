import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChaptersView } from "@/components/admin/views/chapters-view";
import { ButtonLink } from "@/components/ui/button";
import { getAdminNovel, type AdminChapterQuery } from "@/services/admin-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = getAdminNovel(slug);
  return { title: novel ? `ตอนของ ${novel.thaiTitle}` : "ไม่พบนิยาย" };
}

export default async function AdminNovelChaptersPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<AdminChapterQuery>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const novel = getAdminNovel(slug);
  if (!novel) notFound();

  return (
    <>
      <AdminPageHeader
        title={`ตอนของ ${novel.thaiTitle}`}
        description="จัดการลำดับตอน ราคาเหรียญ และคิวเผยแพร่ของเรื่องนี้"
        crumbs={[
          { label: "หลังบ้าน", href: "/admin" },
          { label: "นิยาย", href: "/admin/novels" },
          { label: novel.thaiTitle, href: `/admin/novels/${novel.slug}` },
          { label: "ตอน" }
        ]}
        actions={
          <ButtonLink href={`/admin/novels/${novel.slug}/chapters/new`}>
            <Plus className="h-4 w-4" />
            เพิ่มตอนใหม่
          </ButtonLink>
        }
      />
      <ChaptersView initialQuery={query} basePath={`/admin/novels/${novel.slug}/chapters`} novelSlug={novel.slug} />
    </>
  );
}
