import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { ChaptersView } from "@/components/admin/views/chapters-view";
import { getAdminChapters, type AdminChapterQuery } from "@/services/admin-service";

export const metadata: Metadata = { title: "ตอนทั้งหมด" };

export default async function AdminChaptersPage({ searchParams }: { searchParams: Promise<AdminChapterQuery> }) {
  const query = await searchParams;
  const result = await getAdminChapters(query);
  return <><AdminPageHeader title="ตอนทั้งหมด" description="ค้นหาและตรวจสถานะตอนจากทุกเรื่อง" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "ตอนทั้งหมด" }]} /><ChaptersView result={result} query={query} /></>;
}
