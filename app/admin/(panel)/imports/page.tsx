import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ImportsView } from "@/components/admin/views/imports-view";
import { getAdminImportSources, type AdminImportQuery } from "@/services/admin-import-service";

export const metadata: Metadata = { title: "รายการนำเข้า" };

export default async function AdminImportsPage({ searchParams }: { searchParams: Promise<AdminImportQuery> }) {
  const query = await searchParams;
  const result = await getAdminImportSources(query);
  return <><AdminPageHeader title="รายการนำเข้า" description="ตรวจเรื่อง ตอน ภาษา checkpoint และสถานะภาพปกที่รับจาก Windows app" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "รายการนำเข้า" }]} /><ImportsView result={result} query={query} /></>;
}
