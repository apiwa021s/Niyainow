import type { Metadata } from "next";
import { Suspense } from "react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TranslationStudioView } from "@/components/admin/views/translation-studio-view";
import { Skeleton } from "@/components/ui/section";
import { getTranslationStudio } from "@/services/translation-service";

export const metadata: Metadata = { title: "AI Translation Studio" };

async function TranslationStudioContent() {
  const data = await getTranslationStudio();
  return <TranslationStudioView data={data} />;
}

function TranslationStudioFallback() {
  return (
    <div className="grid gap-5" aria-label="กำลังโหลด Translation Studio">
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 rounded-[16px]" />)}
      </div>
      <Skeleton className="h-80 rounded-[16px]" />
      <Skeleton className="h-72 rounded-[16px]" />
    </div>
  );
}

export default function TranslationStudioPage() {
  return (
    <>
      <AdminPageHeader
        title="AI Translation Studio"
        description="จัดการต้นฉบับ บริบท งานแปล การตรวจ QA และค่าใช้จ่ายจากจุดเดียว"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "Translation Studio" }]}
      />
      <Suspense fallback={<TranslationStudioFallback />}>
        <TranslationStudioContent />
      </Suspense>
    </>
  );
}
