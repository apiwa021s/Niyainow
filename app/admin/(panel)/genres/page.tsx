import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { GenresView } from "@/components/admin/views/genres-view";
import { getAdminTaxonomy } from "@/services/admin-service";

export const metadata: Metadata = { title: "แนวนิยาย" };
export default async function GenresPage() {
  const taxonomy = await getAdminTaxonomy();
  return <><AdminPageHeader title="แนวนิยาย" description="สร้าง แก้ไข จัดลำดับ และปิดใช้งาน taxonomy สำหรับ production โดยไม่พึ่ง mock seed" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แนวนิยาย" }]} /><GenresView genres={taxonomy.genres} /></>;
}
