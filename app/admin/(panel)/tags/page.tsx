import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TagsView } from "@/components/admin/views/tags-view";
import { getAdminTaxonomy } from "@/services/admin-service";

export const metadata: Metadata = { title: "แท็ก" };
export default async function TagsPage() {
  const taxonomy = await getAdminTaxonomy();
  return <><AdminPageHeader title="แท็ก" description="แท็กและ usage count จากฐานข้อมูล" crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "แท็ก" }]} /><TagsView tags={taxonomy.tags} /></>;
}
