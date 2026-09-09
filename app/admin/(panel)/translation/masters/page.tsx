import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TranslationMastersView } from "@/components/admin/views/translation-masters-view";
import { getTranslationMasterAdminData } from "@/services/translation-master-service";

export const metadata: Metadata = { title: "Translation Master" };

export default async function TranslationMastersPage() {
  const data = await getTranslationMasterAdminData();
  return <>
    <AdminPageHeader
      title="Translation Master"
      description="ตรวจและอนุมัติกฎกลาง แนวหลัก แนวเสริม ฉาก และสูตรผสม ก่อนนำไปสร้าง Profile รายเรื่อง"
      crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "Translation Studio", href: "/admin/translation" }, { label: "Master" }]}
    />
    <TranslationMastersView data={data} />
  </>;
}
