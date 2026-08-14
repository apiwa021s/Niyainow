import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { FileStack } from "lucide-react";
import { AdminPageHeader, StatCard } from "@/components/admin/admin-ui";
import { NovelFormView } from "@/components/admin/views/novel-form-view";
import { ButtonLink } from "@/components/ui/button";
import { formatNumber } from "@/lib/utils";
import { getAdminNovel } from "@/services/admin-service";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const novel = getAdminNovel(slug);
  return { title: novel ? `แก้ไข ${novel.thaiTitle}` : "ไม่พบนิยาย" };
}

export default async function AdminNovelEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const novel = getAdminNovel(slug);
  if (!novel) notFound();

  return (
    <>
      <AdminPageHeader
        title={novel.thaiTitle}
        description={`${novel.title} · ดูแลโดย ${novel.owner}`}
        crumbs={[
          { label: "หลังบ้าน", href: "/admin" },
          { label: "นิยาย", href: "/admin/novels" },
          { label: novel.thaiTitle }
        ]}
        actions={
          <ButtonLink href={`/admin/novels/${novel.slug}/chapters`} variant="secondary">
            <FileStack className="h-4 w-4" />
            จัดการตอน ({novel.chapters.toLocaleString("th-TH")})
          </ButtonLink>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ยอดอ่านทั้งหมด" value={formatNumber(novel.views)} hint="นับตั้งแต่เผยแพร่" />
        <StatCard label="ยอดอ่านสัปดาห์นี้" value={formatNumber(novel.viewsThisWeek)} hint="7 วันล่าสุด" />
        <StatCard label="รายได้สะสม" value={novel.revenueTHB} unit="บาท" hint="จากเหรียญที่ใช้ปลดล็อกตอน" />
        <StatCard label="คนบุ๊กมาร์ก" value={formatNumber(novel.bookmarkCount ?? 0)} hint={`คะแนน ${novel.rating} จาก 5`} />
      </div>

      <NovelFormView novel={novel} />
    </>
  );
}
