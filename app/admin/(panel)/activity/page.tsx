import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ActivityView } from "@/components/admin/views/activity-view";

export const metadata: Metadata = {
  title: "บันทึกกิจกรรม",
  description: "ประวัติการทำงานของทีมงานในระบบหลังบ้าน"
};

export default function AdminActivityPage() {
  return (
    <>
      <AdminPageHeader
        title="บันทึกกิจกรรม"
        description="ทุกการเปลี่ยนแปลงในหลังบ้านถูกบันทึกไว้ ตรวจสอบย้อนหลังได้ 365 วัน"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "บันทึกกิจกรรม" }]}
      />
      <ActivityView />
    </>
  );
}
