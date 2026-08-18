import { PageHeader, PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "เกี่ยวกับ NovelNow",
  description: "รู้จักแนวคิดและหลักการออกแบบประสบการณ์อ่านนิยายภาษาไทยของ NovelNow",
  path: "/about"
});

const principles = [
  ["01", "เนื้อหามาก่อน", "ลำดับชั้นของหน้า สี และการเคลื่อนไหวต้องช่วยให้ค้นพบเรื่องและกลับไปอ่านต่อได้โดยไม่แย่งความสนใจจากงานเขียน"],
  ["02", "อ่านได้ก่อน สมัครทีหลัง", "เนื้อหาสาธารณะเปิดอ่านได้ทันที บัญชี Google ใช้เมื่อผู้อ่านต้องการซิงก์ชั้นหนังสือ ประวัติ และความคืบหน้า"],
  ["03", "เคารพผู้อ่านและผู้สร้างสรรค์", "เราออกแบบให้ข้อมูลสำคัญตรงไปตรงมา พร้อมทางเข้าถึงข้อกำหนด ความเป็นส่วนตัว และแนวทางลิขสิทธิ์ที่หาเจอได้เสมอ"]
] as const;

export default function AboutPage() {
  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow="ABOUT / NOVELNOW"
        title="พื้นที่อ่านที่สงบ ชัด และกลับมาอ่านต่อได้ง่าย"
        description="NovelNow คือแพลตฟอร์มอ่านนิยายภาษาไทยที่วางเนื้อหาไว้เหนือสิ่งรบกวน ออกแบบสำหรับการค้นพบเรื่องใหม่และการอ่านต่อเนื่องบนทุกขนาดหน้าจอ"
      />

      <section aria-labelledby="principles-title" className="mt-10 grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div>
          <p className="editorial-kicker">OUR PRINCIPLES</p>
          <h2 id="principles-title" className="mt-2 text-2xl font-semibold">หลักที่ใช้ตัดสินใจ</h2>
        </div>
        <ol>
          {principles.map(([index, title, body]) => (
            <li key={index} className="grid gap-3 border-b border-border py-6 sm:grid-cols-[52px_180px_minmax(0,1fr)] sm:gap-5">
              <span className="tabular font-mono text-xs font-semibold text-[var(--brand-light-on-light)]">{index}</span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-7 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </PageShell>
  );
}
