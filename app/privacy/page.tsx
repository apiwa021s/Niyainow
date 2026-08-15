import { PageHeader, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "นโยบายความเป็นส่วนตัว",
  description: "นโยบายการเก็บ ใช้ และรักษาข้อมูลบัญชีและข้อมูลการอ่านของผู้ใช้ NiyaiThai",
  path: "/privacy"
});

const sections = [
  {
    title: "ข้อมูลเมื่อเข้าสู่ระบบ",
    body: "เมื่อคุณเลือกเข้าสู่ระบบด้วย Google ระบบรับข้อมูลที่จำเป็นต่อการสร้างบัญชีและเซสชัน เช่น รหัสบัญชี อีเมล ชื่อ และรูปโปรไฟล์ ตามสิทธิ์ที่หน้าลงชื่อเข้าใช้แสดงให้คุณเห็น"
  },
  {
    title: "ข้อมูลการใช้งานส่วนบุคคล",
    body: "ชั้นหนังสือ การติดตาม คะแนน รีวิว ประวัติ และความคืบหน้าการอ่านถูกเก็บเพื่อแสดงผลและซิงก์ระหว่างอุปกรณ์ การตั้งค่าหน้าอ่านบางรายการอาจเก็บไว้เฉพาะในเบราว์เซอร์ของคุณ"
  },
  {
    title: "บันทึกทางเทคนิค",
    body: "ระบบอาจเก็บบันทึกที่จำเป็นต่อความปลอดภัย การตรวจสอบความผิดพลาด และการรักษาเสถียรภาพ โดยจำกัดการใช้ข้อมูลตามวัตถุประสงค์ของบริการ"
  },
  {
    title: "การแบ่งปันข้อมูล",
    body: "เราไม่จำหน่ายข้อมูลส่วนบุคคล บริการภายนอกที่จำเป็นต่อการยืนยันตัวตน โฮสติ้ง หรือฐานข้อมูลอาจประมวลผลข้อมูลตามบทบาทของบริการนั้น"
  },
  {
    title: "ทางเลือกของคุณ",
    body: "คุณอ่านเนื้อหาสาธารณะได้โดยไม่สร้างบัญชี ออกจากระบบได้ทุกเมื่อ และสามารถหยุดการซิงก์โดยไม่ใช้ฟีเจอร์บัญชี ช่องทางคำขอเข้าถึง แก้ไข หรือลบบัญชีจะระบุบนหน้านี้เมื่อเปิดใช้งานอย่างเป็นทางการ"
  }
] as const;

export default function PrivacyPage() {
  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow="LEGAL / PRIVACY"
        title="นโยบายความเป็นส่วนตัว"
        description="เราอธิบายข้อมูลที่เกิดขึ้นเมื่อคุณใช้บัญชีและฟีเจอร์ส่วนบุคคล โดยแยกจากการอ่านเนื้อหาสาธารณะที่ไม่ต้องเข้าสู่ระบบ"
      />

      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-between">
        <aside className="text-sm text-muted-foreground">
          <p className="editorial-kicker">YOUR DATA</p>
          <p className="mt-2 leading-6">ปรับปรุงล่าสุด<br /><span className="font-medium text-foreground">15 สิงหาคม 2569</span></p>
        </aside>
        <article className="border-t border-border">
          {sections.map((section, index) => (
            <section key={section.title} className="grid gap-3 border-b border-border py-7 sm:grid-cols-[44px_minmax(0,1fr)]">
              <span className="tabular font-mono text-xs font-semibold text-[var(--brand-light-on-light)]">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2 className="font-serif text-xl font-semibold">{section.title}</h2>
                <p className="mt-3 leading-8 text-muted-foreground">{section.body}</p>
              </div>
            </section>
          ))}
        </article>
      </div>
    </PageShell>
  );
}
