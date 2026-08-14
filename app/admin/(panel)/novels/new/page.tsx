import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { NovelFormView } from "@/components/admin/views/novel-form-view";

export const metadata: Metadata = {
  title: "เพิ่มนิยาย",
  description: "เพิ่มนิยายเรื่องใหม่เข้าระบบ NiyaiNow"
};

export default function AdminNewNovelPage() {
  return (
    <>
      <AdminPageHeader
        title="เพิ่มนิยาย"
        description="กรอกข้อมูลเรื่องให้ครบก่อนเผยแพร่ — บันทึกเป็นฉบับร่างไว้ก่อนได้"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย", href: "/admin/novels" }, { label: "เพิ่มนิยาย" }]}
      />
      <NovelFormView />
    </>
  );
}
