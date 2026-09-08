import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ImportDetailView } from "@/components/admin/views/import-detail-view";
import { getAdminImportSource } from "@/services/admin-import-service";

export const metadata: Metadata = { title: "รายละเอียดการนำเข้า" };

export default async function AdminImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sourceId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ sourceId }, query] = await Promise.all([params, searchParams]);
  const source = await getAdminImportSource(sourceId, query.page);
  if (!source) notFound();

  return <><AdminPageHeader title={source.title} description={`${source.importReference} · ต้นฉบับ ${source.sourceLanguage}`} crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "รายการนำเข้า", href: "/admin/imports" }, { label: source.title }]} /><ImportDetailView source={source} /></>;
}
