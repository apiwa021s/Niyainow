import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { NovelsView } from "@/components/admin/views/novels-view";
import { ButtonLink } from "@/components/ui/button";
import { getAdminNovels, getAdminReferenceData, type AdminNovelQuery } from "@/services/admin-service";

export const metadata: Metadata = { title: "จัดการนิยาย" };

export default async function AdminNovelsPage({ searchParams }: { searchParams: Promise<AdminNovelQuery> }) {
  const query = await searchParams;
  const [result, references] = await Promise.all([getAdminNovels(query), getAdminReferenceData()]);
  return <>
    <AdminPageHeader title="จัดการนิยาย" description="ข้อมูลจริงจาก PostgreSQL พร้อมตัวกรองแบบ server-side และ pagination" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "นิยาย" }]} actions={<ButtonLink href="/admin/novels/new"><Plus className="h-4 w-4" />เพิ่มนิยาย</ButtonLink>} />
    <NovelsView result={result} query={query} references={references} />
  </>;
}
