import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { SubmissionsView } from "@/components/admin/views/submissions-view";

export const metadata: Metadata = {
  title: "เรื่องรออนุมัติ",
  description: "ตรวจและอนุมัตินิยายที่ทีมแปลส่งเข้ามา"
};

export default async function AdminSubmissionsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;

  return (
    <>
      <AdminPageHeader
        title="เรื่องรออนุมัติ"
        description="ตรวจคุณภาพงานแปลก่อนปล่อยขึ้นเว็บ — ถ้าปฏิเสธต้องระบุเหตุผลให้ทีมแปลแก้ได้"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "เรื่องรออนุมัติ" }]}
      />
      <SubmissionsView initialStatus={status} />
    </>
  );
}
