import { CheckCircle2, FileSearch, ShieldAlert } from "lucide-react";

import { PageHeader, PageShell } from "@/components/ui/section";
import { Logo } from "@/components/layout/logo";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ลิขสิทธิ์และการแจ้งเนื้อหาละเมิด",
  description: "นโยบายลิขสิทธิ์ ข้อมูลที่ต้องเตรียม และสถานะช่องทางรับแจ้งเนื้อหาของ NovelNow",
  path: "/copyright"
});

const steps = [
  {
    icon: FileSearch,
    title: "ระบุเนื้อหาที่พบ",
    body: "เก็บลิงก์ของหน้า ชื่อผลงาน ชื่อตอน และภาพหน้าจอที่ช่วยให้ระบุตำแหน่งได้ชัดเจน"
  },
  {
    icon: ShieldAlert,
    title: "อธิบายสิทธิ์ของผู้แจ้ง",
    body: "ระบุว่าคุณเป็นเจ้าของผลงาน สำนักพิมพ์ ผู้แปล หรือผู้ได้รับมอบอำนาจ พร้อมหลักฐานที่ตรวจสอบความเกี่ยวข้องได้"
  },
  {
    icon: CheckCircle2,
    title: "ตรวจสอบและจำกัดการเข้าถึง",
    body: "เมื่อช่องทางรับเรื่องเปิดใช้งาน ทีมงานจะประเมินข้อมูล จำกัดการเข้าถึงเมื่อมีเหตุสมควร และบันทึกผลการตรวจสอบ"
  }
] as const;

export default function CopyrightPage() {
  return (
    <PageShell className="max-w-6xl">
      <PageHeader
        eyebrow="LEGAL / COPYRIGHT"
        title="ลิขสิทธิ์และการแจ้งเนื้อหาละเมิด"
        description="NovelNow มีนโยบายเคารพสิทธิ์ของผู้เขียน ผู้แปล สำนักพิมพ์ และผู้สร้างสรรค์ทุกฝ่าย"
        action={<Logo />}
      />

      <section aria-labelledby="process-title" className="mt-10">
        <div className="max-w-3xl">
          <p className="editorial-kicker">REPORTING PROCESS</p>
          <h2 id="process-title" className="mt-2 text-2xl font-semibold">ข้อมูลที่ช่วยให้ตรวจสอบได้ตรงจุด</h2>
          <p className="mt-3 leading-8 text-muted-foreground">การแจ้งที่มี URL รายละเอียดผลงาน และฐานสิทธิ์ครบถ้วนช่วยลดความคลาดเคลื่อนและทำให้ประเมินเนื้อหาได้เร็วขึ้น</p>
        </div>

        <ol className="mt-7 grid gap-2 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="rounded-[8px] bg-card/70 p-5">
                <div className="flex items-center justify-between">
                  <Icon aria-hidden className="h-5 w-5 text-[var(--brand-light-on-light)]" />
                  <span className="tabular font-mono text-xs text-muted-foreground">0{index + 1}</span>
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.body}</p>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-10 grid gap-4 border-l-2 border-[var(--brand-emphasis)] bg-[var(--bg-subtle)] p-5 sm:p-6">
        <h2 className="text-xl font-semibold">สถานะบริการในขณะนี้</h2>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          ช่องทางรับคำร้องออนไลน์ที่ยืนยันตัวผู้แจ้งยังไม่เปิดใช้งาน โปรดเก็บหลักฐานไว้และกลับมาตรวจสอบหน้านี้ ซึ่งจะระบุช่องทางอย่างเป็นทางการเมื่อพร้อมใช้งาน เราจะไม่ขอเอกสารส่วนบุคคลผ่านข้อความหรือบัญชีที่ไม่ได้ประกาศบนหน้านี้
        </p>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground">
          ระบบชำระเงิน กระเป๋าเหรียญ และรางวัลสำหรับการแจ้งยังไม่เปิดให้บริการ หน้านี้ไม่รับชำระเงินและไม่มีการมอบ คืน หรือแลกเหรียญ
        </p>
      </section>

      <section lang="en" className="mt-10 border-t border-border pt-7">
        <p className="editorial-kicker">ENGLISH NOTICE</p>
        <h2 className="mt-2 text-xl font-semibold">Copyright reporting status</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          NovelNow respects the rights of authors, translators, publishers, and other creators. The verified online reporting channel is not yet available. Please preserve the page URL, work details, screenshots, and evidence of authority, then return to this page for the official channel. Payments, coins, and reporting rewards are not available.
        </p>
      </section>
    </PageShell>
  );
}

