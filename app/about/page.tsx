import type { Metadata } from "next";
import { PageShell, SectionHeader } from "@/components/ui/section";

export const metadata: Metadata = { title: "เกี่ยวกับ NiyaiNow" };

export default function AboutPage() {
  return (
    <PageShell className="space-y-4">
      <SectionHeader title="เกี่ยวกับ NiyaiNow" />
      <p className="max-w-3xl leading-7 text-muted-foreground">NiyaiNow คือแพลตฟอร์มอ่านนิยาย mock สำหรับสาธิตประสบการณ์ฝั่งผู้อ่านแบบครบเส้นทาง ตั้งแต่ค้นหา เปิดรายละเอียด อ่านต่อ จัดคลัง และตั้งค่าการอ่าน</p>
    </PageShell>
  );
}
