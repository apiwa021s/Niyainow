import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { SettingsView } from "@/components/admin/views/settings-view";

export const metadata: Metadata = {
  title: "ตั้งค่าเว็บไซต์",
  description: "ตั้งค่าข้อมูลเว็บ การเปิดรับสมาชิก โหมดคอมเมนต์ และส่วนแบ่งรายได้"
};

export default function AdminSettingsPage() {
  return (
    <>
      <AdminPageHeader
        title="ตั้งค่าเว็บไซต์"
        description="ค่าที่ตั้งในหน้านี้มีผลกับผู้ใช้ทุกคนทันทีหลังกดบันทึก"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ตั้งค่าเว็บไซต์" }]}
      />
      <SettingsView />
    </>
  );
}
