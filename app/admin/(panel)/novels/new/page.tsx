import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { NovelFormView } from "@/components/admin/views/novel-form-view";
import { getAdminReferenceData } from "@/services/admin-service";

export const metadata: Metadata = { title: "เพิ่มนิยาย" };

export default async function AdminNewNovelPage() {
  const references = await getAdminReferenceData();
  return <>
    <AdminPageHeader title="เพิ่มนิยาย" description="บันทึกข้อมูลเรื่อง ผู้แต่ง แนว แท็ก และไฟล์ภาพ R2" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย", href: "/admin/novels" }, { label: "เพิ่มนิยาย" }]} />
    <NovelFormView references={references} />
  </>;
}
