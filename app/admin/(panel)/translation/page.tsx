import type { Metadata } from "next";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TranslationStudioView } from "@/components/admin/views/translation-studio-view";
import { requireAdmin } from "@/lib/auth/dal";
import { getTranslationStudio } from "@/services/translation-service";

export const metadata: Metadata = { title: "AI Translation Studio" };

export default async function TranslationStudioPage() {
  const [, data] = await Promise.all([requireAdmin("/admin/translation"), getTranslationStudio()]);
  return (
    <>
      <AdminPageHeader
        title="AI Translation Studio"
        description="จัดการต้นฉบับ บริบท งานแปล การตรวจ QA และค่าใช้จ่ายจากจุดเดียว"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "Translation Studio" }]}
      />
      <TranslationStudioView data={data} />
    </>
  );
}
