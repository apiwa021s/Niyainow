import { PageShell, SectionHeader } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "เกี่ยวกับ NiyaiNow",
  description: "รู้จัก NiyaiNow แพลตฟอร์มอ่านนิยายภาษาไทยและการซิงก์ข้อมูลผู้อ่านด้วยบัญชี Google",
  path: "/about",
});

export default function AboutPage() {
  return (
    <PageShell className="space-y-4">
      <SectionHeader title="เกี่ยวกับ NiyaiNow" />
      <p className="max-w-3xl leading-7 text-muted-foreground">
        NiyaiNow คือแพลตฟอร์มอ่านนิยายภาษาไทยที่ออกแบบให้ค้นหา เปิดอ่าน และติดตามความคืบหน้าได้รวดเร็วบนทุกอุปกรณ์
        ผู้เยี่ยมชมอ่านเนื้อหาสาธารณะได้โดยไม่ต้องสมัครบัญชี ส่วนการเข้าสู่ระบบด้วย Google ใช้สำหรับซิงก์คลัง ประวัติ และคะแนนของผู้อ่าน
      </p>
    </PageShell>
  );
}
