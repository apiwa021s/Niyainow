import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TagsView } from "@/components/admin/views/tags-view";

export const metadata: Metadata = {
  title: "แท็ก",
  description: "จัดการแท็กของนิยาย รวมแท็กที่ซ้ำความหมาย และลบแท็กที่ไม่ได้ใช้"
};

export default function AdminTagsPage() {
  return (
    <>
      <AdminPageHeader
        title="แท็ก"
        description="แท็กช่วยให้ผู้อ่านหาเรื่องแนวเดียวกันเจอ ถ้าปล่อยให้ซ้ำซ้อนจะกลายเป็นตัวกรองที่ใช้ไม่ได้"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แท็ก" }]}
      />
      <TagsView />
    </>
  );
}
