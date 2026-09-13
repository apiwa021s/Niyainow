import type { Metadata } from "next";
import { Download, Sparkles } from "lucide-react";
import { Suspense } from "react";

import { AdminPageHeader } from "@/components/admin/admin-ui";
import { TranslationStudioView } from "@/components/admin/views/translation-studio-view";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/section";
import { getTranslationStudio } from "@/services/translation-service";

export const metadata: Metadata = { title: "สตูดิโอแปลนิยายด้วย AI" };

async function TranslationStudioContent() {
  const data = await getTranslationStudio();
  return <TranslationStudioView data={data} />;
}

function TranslationStudioFallback() {
  return (
    <div className="grid gap-5" aria-label="กำลังโหลด Translation Studio">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-28 rounded-[16px]" />)}
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
        title="สตูดิโอแปลนิยายด้วย AI"
        description="ทดลองแปลเป็นชุด ติดตามต้นทุน ตรวจคุณภาพร่วมกัน และคุมการเผยแพร่จากที่เดียว"
        crumbs={[{ label: "หลังบ้าน", href: "/admin" }, { label: "สตูดิโอแปลนิยาย" }]}
        actions={<><ButtonLink href="/admin/imports" variant="outline"><Download className="h-4 w-4" />นำเข้าต้นฉบับ</ButtonLink><ButtonLink href="#new-translation"><Sparkles className="h-4 w-4" />เริ่มทดลอง</ButtonLink></>}
      />
      <Suspense fallback={<TranslationStudioFallback />}>
        <TranslationStudioContent />
      </Suspense>
    </>
  );
}
