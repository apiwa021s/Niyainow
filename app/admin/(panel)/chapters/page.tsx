import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChaptersView } from "@/components/admin/views/chapters-view";
import type { AdminChapterQuery } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "ตอนทั้งหมด",
  description: "ดูและจัดการตอนของทุกเรื่องในที่เดียว พร้อมคิวเผยแพร่และราคาเหรียญ"
};

export default async function AdminChaptersPage({ searchParams }: { searchParams: Promise<AdminChapterQuery> }) {
  const query = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="ตอนทั้งหมด"
        description="รวมตอนของทุกเรื่อง ใช้ตรวจคิวเผยแพร่และฉบับร่างที่ค้างอยู่"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ตอนทั้งหมด" }]}
      />
      <ChaptersView initialQuery={query} basePath="/admin/chapters" />
    </>
  );
}
