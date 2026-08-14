import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { GenresView } from "@/components/admin/views/genres-view";

export const metadata: Metadata = {
  title: "แนวนิยาย",
  description: "เพิ่ม แก้ไข และจัดระเบียบแนวนิยายทั้งหมดของเว็บ"
};

export default function AdminGenresPage() {
  return (
    <>
      <AdminPageHeader
        title="แนวนิยาย"
        description="แนวคือตัวกรองหลักที่ผู้อ่านใช้ ควรมีจำนวนพอดีและชื่อไม่ซ้ำความหมายกัน"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แนวนิยาย" }]}
      />
      <GenresView />
    </>
  );
}
