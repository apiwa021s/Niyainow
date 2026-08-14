import { CheckCircle2, Coins, MailCheck, ShieldAlert } from "lucide-react";

import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ลิขสิทธิ์และการแจ้งเนื้อหาละเมิด",
  description:
    "NiyaiNow ไม่เผยแพร่งานที่ยังมีลิขสิทธิ์ในประเทศไทย และนำเนื้อหาที่ละเมิดสิทธิ์ออกทันทีที่ตรวจสอบแล้ว",
  path: "/copyright",
});

/** จำนวนเหรียญที่มอบให้ผู้แจ้งเบาะแสที่ตรวจสอบแล้วว่าถูกต้อง — แก้ที่เดียวได้ทั้งหน้า */
const REWARD_COINS = 77;

const steps = [
  {
    icon: MailCheck,
    title: "1. ส่งรายละเอียดมาให้เรา",
    body: "ระบุลิงก์ของหน้าที่พบปัญหา ชื่อผลงาน และสิทธิ์ที่คุณถือครอง (เจ้าของผลงาน สำนักพิมพ์ หรือผู้ได้รับมอบอำนาจ) ยิ่งข้อมูลครบ เรายิ่งตรวจสอบได้เร็ว",
  },
  {
    icon: ShieldAlert,
    title: "2. เราตรวจสอบทันทีที่ได้รับ",
    body: "เนื้อหาที่มีเหตุอันควรเชื่อว่าละเมิดจะถูกซ่อนจากผู้อ่านระหว่างการตรวจสอบ เพื่อจำกัดความเสียหายก่อนสรุปผล",
  },
  {
    icon: CheckCircle2,
    title: "3. นำออกและแจ้งผลกลับ",
    body: "เมื่อยืนยันได้ว่าเป็นการละเมิด เนื้อหาจะถูกนำออกอย่างถาวร และเราจะแจ้งผลกลับไปยังผู้แจ้งทุกกรณี",
  },
];

export default function CopyrightPage() {
  return (
    <PageShell className="space-y-6">
      <header className="rounded-[16px] border border-border bg-card p-5 sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]">
          <ShieldAlert className="h-6 w-6" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">ลิขสิทธิ์และการแจ้งเนื้อหาละเมิด</h1>
        <p className="mt-3 max-w-3xl leading-[1.9] text-muted-foreground">
          NiyaiNow ไม่เผยแพร่งานที่ยังได้รับความคุ้มครองลิขสิทธิ์ในประเทศไทย
          เราเชื่อว่าผลงานที่ดีต้องกลับไปสร้างรายได้ให้ผู้เขียนและผู้แปลตัวจริง
          หากคุณพบเนื้อหาบนเว็บไซต์นี้ที่ละเมิดสิทธิ์ของคุณ แจ้งเราได้ทันที
          เราจะตรวจสอบและนำออกโดยเร็วที่สุดโดยไม่คิดค่าใช้จ่ายใด ๆ
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="rounded-[16px] border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-[var(--brand-light-on-light)]" aria-hidden />
              <h2 className="mt-3 font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-[1.85] text-muted-foreground">{step.body}</p>
            </article>
          );
        })}
      </section>

      <section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[image:var(--grad-primary)] text-white">
          <Coins className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">ขอบคุณทุกการแจ้งเบาะแส</h2>
          <p className="mt-1 text-sm leading-[1.85] text-muted-foreground">
            การแจ้งที่ตรวจสอบแล้วว่าถูกต้อง เราจะมอบ{" "}
            <strong className="tabular font-semibold text-foreground">{REWARD_COINS} เหรียญ</strong>{" "}
            เข้าบัญชีของคุณเป็นการขอบคุณที่ช่วยกันดูแลผลงานของผู้สร้างสรรค์
          </p>
        </div>
      </section>

      <section className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">พบปัญหาการใช้งานเว็บไซต์</h2>
        <p className="mt-2 max-w-3xl text-sm leading-[1.85] text-muted-foreground">
          หน้าเปิดไม่ขึ้น ตอนหาย หรือเหรียญไม่เข้า แจ้งผ่านช่องทางเดียวกันได้เลย
          ระบุอุปกรณ์ที่ใช้และลิงก์ของหน้าที่มีปัญหามาด้วย จะช่วยให้เราตามเรื่องได้เร็วขึ้นมาก
        </p>
      </section>

      {/* ฉบับภาษาอังกฤษ — ผู้ถือสิทธิ์ต่างประเทศต้องอ่านเข้าใจได้โดยไม่ต้องแปลเอง */}
      <section lang="en" className="rounded-[16px] border border-border bg-card p-5 sm:p-6">
        <h2 className="font-semibold">Copyright notice</h2>
        <p className="mt-2 max-w-3xl text-sm leading-[1.85] text-muted-foreground">
          NiyaiNow does not publish works that remain under copyright protection in Thailand. If you are a
          rights holder and find content on this site that infringes your rights, please send us the page
          link, the title of the work, and the basis of your claim. Reported content is hidden from readers
          while we review it, removed permanently once the claim is verified, and we reply to every report.
          Verified reports receive {REWARD_COINS} coins as our thanks.
        </p>
      </section>
    </PageShell>
  );
}
