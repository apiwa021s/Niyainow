import type { Metadata } from "next";
import { PageShell, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว" };

export default function PrivacyPage() {
  return (
    <PageShell className="space-y-4">
      <SectionHeader title="นโยบายความเป็นส่วนตัว" />
      <p className="max-w-3xl leading-7 text-muted-foreground">เดโมนี้ไม่ส่งข้อมูลไปยัง backend ข้อมูลการอ่าน ธีม บุ๊กมาร์ก และบัญชี mock ถูกเก็บไว้ใน LocalStorage ของเบราว์เซอร์เท่านั้น</p>
    </PageShell>
  );
}
