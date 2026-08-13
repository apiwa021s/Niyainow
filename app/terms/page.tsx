import type { Metadata } from "next";
import { PageShell, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "ข้อกำหนดการใช้งาน" };

export default function TermsPage() {
  return (
    <PageShell className="space-y-4">
      <SectionHeader title="ข้อกำหนดการใช้งาน" />
      <p className="max-w-3xl leading-7 text-muted-foreground">เนื้อหาในเดโมนี้เป็นข้อมูลสมมติ ใช้เพื่อทดสอบ UI/UX เท่านั้น การเข้าสู่ระบบ คลัง และการแจ้งเตือนเป็นระบบจำลองผ่าน LocalStorage</p>
    </PageShell>
  );
}
