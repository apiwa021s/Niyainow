import { PageHeader, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ข้อกำหนดการใช้งาน",
  description: "ข้อกำหนดการเข้าถึงบัญชี เนื้อหา และฟีเจอร์ของแพลตฟอร์ม NiyaiThai",
  path: "/terms"
});

const termsSections = [
  {
    title: "การเข้าถึงบริการ",
    body: ["คุณอ่านเนื้อหาที่เผยแพร่สู่สาธารณะได้โดยไม่ต้องเข้าสู่ระบบ ฟีเจอร์ส่วนบุคคล เช่น ชั้นหนังสือ ประวัติ และการซิงก์ความคืบหน้า ต้องใช้บัญชี Google"]
  },
  {
    title: "บัญชีและความปลอดภัย",
    body: ["คุณต้องไม่ใช้บัญชีของผู้อื่นโดยไม่ได้รับอนุญาต และควรออกจากระบบเมื่อใช้อุปกรณ์ร่วมกัน เราอาจจำกัดการเข้าถึงบัญชีที่มีพฤติกรรมเสี่ยงต่อผู้ใช้หรือระบบ"]
  },
  {
    title: "การใช้งานที่ยอมรับได้",
    body: ["ห้ามรบกวนระบบ พยายามข้ามสิทธิ์ เข้าถึงเนื้อหาที่ยังไม่เผยแพร่ ส่งไฟล์หรือโค้ดอันตราย เก็บข้อมูลโดยอัตโนมัติในลักษณะที่สร้างภาระต่อระบบ หรือเผยแพร่รีวิวที่ผิดกฎหมาย ละเมิดสิทธิ์ หรือเป็นสแปม"]
  },
  {
    title: "เนื้อหาและสิทธิ์",
    body: ["นิยาย ภาพปก และสื่อประกอบเป็นสิทธิ์ของเจ้าของผลงานตามที่ระบุ การเข้าถึงผ่านเว็บไซต์ไม่ได้ให้สิทธิ์คัดลอก ดัดแปลง จำหน่าย หรือเผยแพร่ซ้ำ หากพบเนื้อหาที่อาจละเมิดสิทธิ์ โปรดดูขั้นตอนในหน้าลิขสิทธิ์"]
  },
  {
    title: "ฟีเจอร์เชิงพาณิชย์",
    body: ["ขณะนี้ระบบชำระเงิน กระเป๋าเหรียญ และการซื้อเนื้อหายังไม่เปิดให้บริการ NiyaiThai จะประกาศเงื่อนไขที่เกี่ยวข้องก่อนเปิดฟีเจอร์ดังกล่าว และจะไม่ถือว่าข้อความทดลองในระบบเป็นยอดเงินหรือสิทธิ์ที่แลกคืนได้"]
  },
  {
    title: "การเปลี่ยนแปลงบริการ",
    body: ["เราอาจปรับปรุง ระงับ หรือยกเลิกบางฟีเจอร์เมื่อจำเป็นต่อความปลอดภัย ความถูกต้อง หรือการดำเนินงาน และจะแสดงข้อกำหนดฉบับที่มีผลใช้งานบนหน้านี้"]
  }
] as const;

export default function TermsPage() {
  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow="LEGAL / TERMS"
        title="ข้อกำหนดการใช้งาน"
        description="หลักเกณฑ์สำหรับการอ่าน การใช้บัญชี และการดูแลพื้นที่ร่วมกันของ NiyaiThai"
      />
      <LegalArticle sections={termsSections} updated="15 สิงหาคม 2569" />
    </PageShell>
  );
}

function LegalArticle({ sections, updated }: { sections: typeof termsSections; updated: string }) {
  return (
    <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,720px)] lg:justify-between">
      <aside className="text-sm text-muted-foreground">
        <p className="editorial-kicker">DOCUMENT STATUS</p>
        <p className="mt-2 leading-6">ปรับปรุงล่าสุด<br /><span className="font-medium text-foreground">{updated}</span></p>
      </aside>
      <article className="border-t border-border">
        {sections.map((section, index) => (
          <section key={section.title} className="grid gap-3 border-b border-border py-7 sm:grid-cols-[44px_minmax(0,1fr)]">
            <span className="tabular font-mono text-xs font-semibold text-[var(--brand-light-on-light)]">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <h2 className="text-xl font-semibold">{section.title}</h2>
              {section.body.map((paragraph) => <p key={paragraph} className="mt-3 leading-8 text-muted-foreground">{paragraph}</p>)}
            </div>
          </section>
        ))}
      </article>
    </div>
  );
}
