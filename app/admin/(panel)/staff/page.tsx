import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { StaffView } from "@/components/admin/views/staff-view";

export const metadata: Metadata = {
  title: "ทีมงานและสิทธิ์",
  description: "จัดการสมาชิกทีมหลังบ้านและสิทธิ์การเข้าถึง"
};

export default function AdminStaffPage() {
  return (
    <>
      <AdminPageHeader
        title="ทีมงานและสิทธิ์"
        description="ให้สิทธิ์เท่าที่จำเป็นกับงาน และทบทวนรายชื่อทุกไตรมาส"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ทีมงานและสิทธิ์" }]}
      />
      <StaffView />
    </>
  );
}
