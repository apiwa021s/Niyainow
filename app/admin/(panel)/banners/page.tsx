import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { BannersView } from "@/components/admin/views/banners-view";
import { getAdminBanners } from "@/services/admin-service";

export const metadata: Metadata = { title: "แบนเนอร์" };
export default async function BannersPage() {
  const banners = await getAdminBanners();
  return (
    <>
      <AdminPageHeader
        title="แบนเนอร์"
        description="แบนเนอร์โปรโมทบนหน้าแรก อัปโหลดภาพ ตั้งลิงก์ปลายทาง และกำหนดช่วงเวลาแสดงผล"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แบนเนอร์" }]}
      />
      <BannersView banners={banners} />
    </>
  );
}
