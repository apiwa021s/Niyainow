import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { BannersView } from "@/components/admin/views/banners-view";

export const metadata: Metadata = {
  title: "แบนเนอร์หน้าแรก",
  description: "จัดลำดับและตั้งเวลาแบนเนอร์โปรโมตบนหน้าแรก"
};

export default function AdminBannersPage() {
  return (
    <>
      <AdminPageHeader
        title="แบนเนอร์หน้าแรก"
        description="พื้นที่โปรโมตที่คนเห็นมากที่สุดของเว็บ — ตรวจ CTR ทุกสัปดาห์แล้วสลับเรื่องที่ไม่เวิร์กออก"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แบนเนอร์หน้าแรก" }]}
      />
      <BannersView />
    </>
  );
}
