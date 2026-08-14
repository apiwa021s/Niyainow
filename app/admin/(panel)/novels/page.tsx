import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { NovelsView } from "@/components/admin/views/novels-view";
import { ButtonLink } from "@/components/ui/button";
import type { AdminNovelQuery } from "@/services/admin-service";

export const metadata: Metadata = {
  title: "จัดการนิยาย",
  description: "ค้นหา แก้ไข และจัดการสถานะการเผยแพร่ของนิยายทุกเรื่อง"
};

export default async function AdminNovelsPage({ searchParams }: { searchParams: Promise<AdminNovelQuery> }) {
  const query = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="จัดการนิยาย"
        description="แก้ไขข้อมูลเรื่อง จัดการตอน และควบคุมสถานะการเผยแพร่ได้จากที่เดียว"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย" }]}
        actions={
          <ButtonLink href="/admin/novels/new">
            <Plus className="h-4 w-4" />
            เพิ่มนิยาย
          </ButtonLink>
        }
      />
      <NovelsView initialQuery={query} />
    </>
  );
}
