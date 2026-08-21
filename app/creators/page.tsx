import {
  ArrowRight,
  CalendarClock,
  Coins,
  FileSpreadsheet,
  Mail,
  MessageCircle,
  Receipt,
  ShieldCheck,
  Sparkles,
  Undo2,
} from "lucide-react";

import { InkUnderline } from "@/components/about/ink-underline";
import { Reveal } from "@/components/ui/reveal";
import { RevenueCalculator } from "@/components/creators/revenue-calculator";
import { ButtonLink } from "@/components/ui/button";
import { PageShell } from "@/components/ui/section";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "ส่วนแบ่งรายได้สำหรับนักเขียนและนักแปล",
  description:
    "คุณได้ 70% ของราคาป้ายทุกครั้งที่ตอนของคุณถูกปลดล็อก ไม่มีการหักค่าธรรมเนียมใด ๆ ดูวิธีคำนวณ รอบการจ่ายเงิน และวิธีตรวจสอบยอดด้วยตัวเอง",
  path: "/creators",
});

const noExceptions = [
  { case: "ปลดล็อกด้วยเหรียญที่เติมเงินมา", paid: "5 เหรียญ", you: "3.50 บาท", covered: false },
  { case: "ปลดล็อกด้วยเหรียญที่เว็บแจกฟรี", paid: "0 บาท", you: "3.50 บาท", covered: true },
  { case: "ช่วงโปรโมชั่นลดราคา 50%", paid: "2.5 เหรียญ", you: "3.50 บาท", covered: true },
  { case: "แคมเปญเปิดอ่านฟรีทั้งเรื่อง", paid: "0 บาท", you: "3.50 บาท", covered: true },
  { case: "ผู้อ่านใช้ตั๋วฟรีจากกิจกรรม", paid: "0 บาท", you: "3.50 บาท", covered: true },
] as const;

const transparency = [
  "ยอดสะสมของงวดปัจจุบัน อัปเดตต่อเนื่องระหว่างเดือน ไม่ต้องรอสิ้นงวด",
  "แยกตามเรื่อง คลิกเข้าไปดูได้ถึงระดับรายตอน",
  "จำนวนครั้งที่แต่ละตอนถูกปลดล็อก พร้อมยอดเงินของตอนนั้น",
  "แยกให้เห็นว่าเป็นการปลดล็อกด้วยเหรียญเติมเงินหรือเหรียญแจกฟรี",
  "ประวัติการโอนย้อนหลังทุกงวด พร้อมสลิป",
] as const;

const schedule = [
  { icon: CalendarClock, label: "ปิดงวด", detail: "วันสุดท้ายของเดือน เวลา 23:59 น." },
  { icon: Receipt, label: "สรุปยอด", detail: "ภายในวันที่ 7 ของเดือนถัดไป" },
  { icon: Coins, label: "โอนเงิน", detail: "ภายในวันที่ 15 ของเดือนถัดไป" },
  { icon: ShieldCheck, label: "หลักฐาน", detail: "สลิปการโอนพร้อมรายละเอียดการคำนวณ ดูย้อนหลังได้ตลอด" },
] as const;

const refundGuarantees = [
  "ยอดของคุณจะไม่ติดลบ หากหักแล้วเหลือน้อยกว่าศูนย์ ส่วนที่เกินไม่ตกเป็นภาระของคุณ",
  "การหักคืนในงวดใดงวดหนึ่งจะไม่เกิน 20% ของยอดงวดนั้น ส่วนที่เหลือทยอยหักงวดถัดไป",
  "เงินที่โอนให้คุณไปแล้ว NovelNow จะไม่เรียกคืนย้อนหลัง",
  "ทุกรายการกลับรายการจะปรากฏในไฟล์ CSV พร้อมเหตุผล ตรวจสอบได้",
] as const;

const faqs = [
  {
    q: "ทำไมถึงเป็น 70% ไม่ใช่ตัวเลขอื่น",
    a: "เพราะเราคิดว่าคนที่สร้างผลงานควรได้ส่วนใหญ่ของรายได้ที่ผลงานนั้นสร้าง ส่วน 30% ที่เหลือ NovelNow ใช้จ่ายค่าระบบชำระเงิน เซิร์ฟเวอร์ ทีมงาน และการตลาด",
  },
  {
    q: "ค่าธรรมเนียมบัตรเครดิตหักจากส่วนของเราไหม",
    a: "ไม่หัก เราคิด 70% จากราคาป้ายเสมอ ค่าธรรมเนียมทั้งหมดหักจากส่วน 30% ของ NovelNow",
  },
  {
    q: "ถ้าเว็บลดราคาแรง ๆ เราจะรายได้ตกไหม",
    a: "ไม่ตก คุณยังได้ 70% ของราคาป้ายเท่าเดิม และโดยปกติโปรโมชั่นจะทำให้ยอดปลดล็อกสูงขึ้น รายได้รวมของคุณจึงมักเพิ่มขึ้น",
  },
  {
    q: "ตัวเลขที่เห็นในหน้าจัดการผลงานเป็นเรียลไทม์ไหม",
    a: "อัปเดตต่อเนื่องระหว่างวัน อาจมีดีเลย์เล็กน้อย ตัวเลขที่ใช้จ่ายจริงคือตัวเลขที่ล็อกตอนปิดงวดสิ้นเดือน",
  },
  {
    q: "ถ้ายอดที่คำนวณเองไม่ตรงกับที่โอน ต้องทำอย่างไร",
    a: "ส่งไฟล์ CSV งวดนั้นมาที่ทีมงาน เราจะตรวจสอบให้ภายใน 7 วันทำการ และหากเป็นความผิดพลาดของเรา จะจ่ายส่วนต่างพร้อมงวดถัดไป",
  },
  {
    q: "เผยแพร่ที่อื่นพร้อมกันได้ไหม",
    a: "ได้ เว้นแต่จะมีข้อตกลงเฉพาะเรื่องที่ระบุเป็นอย่างอื่น ซึ่งจะแจ้งชัดเจนก่อนเสมอ",
  },
] as const;

export default function CreatorsPage() {
  return (
    <PageShell className="max-w-5xl">
      <Reveal as="section" className="py-4 sm:py-8">
        <p className="editorial-kicker">FOR WRITERS & TRANSLATORS</p>
        <h1 className="mt-2 text-h1 font-semibold sm:text-display">ข้อเสนอส่วนแบ่งรายได้</h1>
        <InkUnderline className="mt-1 max-w-64" />
        <p className="mt-4 max-w-2xl text-body text-(--text-secondary)">
          เอกสารนี้อธิบายว่าเงินทุกบาทที่ผู้อ่านจ่ายเข้ามาถูกแบ่งอย่างไร คำนวณจากอะไร
          และคุณตรวจสอบได้ด้วยตัวเองอย่างไร
        </p>
        <p className="mt-4 text-xs text-(--text-tertiary)">
          เวอร์ชัน 1.0 · มีผลตั้งแต่ 1 กันยายน 2569 · ปรับปรุงล่าสุด 20 สิงหาคม 2569
        </p>
      </Reveal>

      {/* 1. The one number the whole document exists to explain. */}
      <Reveal as="section" aria-labelledby="headline-title" className="mt-6">
        <div className="relative overflow-hidden rounded-xl bg-accent-subtle p-6 sm:p-9">
          <Sparkles aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-24 w-24 text-brand-primary opacity-10" />
          <h2 id="headline-title" className="text-sm font-semibold text-[var(--brand-emphasis)]">
            หลักการเดียวที่ต้องจำ
          </h2>
          <p className="mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            คุณได้ <span className="text-[var(--brand-emphasis)]">70%</span> ของราคาป้าย
          </p>
          <p className="mt-2 text-lg font-semibold text-(--text-secondary)">ทุกครั้งที่ตอนของคุณถูกปลดล็อก</p>
          <p className="mt-4 max-w-2xl leading-7 text-(--text-secondary)">
            ไม่มีการหักค่าธรรมเนียมระบบชำระเงิน ไม่มีค่าดำเนินการ ไม่มีค่าการตลาด ไม่มีบรรทัดซ่อนใด ๆ
            ค่าธรรมเนียมทั้งหมดเป็นภาระของ NovelNow ที่หักจากส่วน 30% ของเราเอง
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card/70 p-5">
          <p className="text-sm leading-7 text-(--text-secondary)">
            <strong className="font-semibold text-(--text-primary)">“ราคาป้าย”</strong> หมายถึงราคาที่ตั้งไว้สำหรับตอนนั้นตามปกติ
            ไม่ใช่ราคาหลังหักส่วนลด ไม่ใช่ราคาหลังหักค่าธรรมเนียม และไม่ใช่ราคาที่ผู้อ่านจ่ายจริงในวันนั้น
          </p>
        </div>
      </Reveal>

      <Reveal as="section" aria-labelledby="calculator-title" className="mt-10 sm:mt-14" delay={60}>
        <h2 id="calculator-title" className="sr-only">
          เครื่องคำนวณส่วนแบ่ง
        </h2>
        <RevenueCalculator />
      </Reveal>

      {/* 2. */}
      <Reveal as="section" aria-labelledby="exceptions-title" className="mt-10 sm:mt-14">
        <p className="editorial-kicker">NO EXCEPTIONS</p>
        <h2 id="exceptions-title" className="mt-2 text-2xl font-semibold">ไม่มีข้อยกเว้น</h2>
        <InkUnderline className="mt-1 max-w-36" variant="swoop" delay="0.05s" />
        <p className="mt-4 max-w-2xl leading-7 text-(--text-secondary)">
          คำถามที่นักแปลถามบ่อยที่สุดคือ “ถ้าเว็บจัดโปรฯ แล้วเราจะเสียส่วนแบ่งไหม” คำตอบคือไม่เสีย
          เพราะเราคิดจากราคาป้ายเสมอ ส่วนลดทุกบาทเป็นเงินที่ NovelNow ออกเอง
        </p>

        <ul className="mt-6 grid gap-3">
          {noExceptions.map((row, index) => (
            <Reveal
              as="li"
              key={row.case}
              delay={index * 50}
              className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-6 sm:p-5"
            >
              <span className="font-medium">{row.case}</span>
              <span className="text-sm text-(--text-secondary) sm:text-right">
                ผู้อ่านจ่าย <span className="font-semibold tabular-nums">{row.paid}</span>
              </span>
              <span className="flex items-baseline gap-2 sm:justify-end">
                <span className="text-lg font-semibold tabular-nums text-[var(--brand-emphasis)]">{row.you}</span>
                {row.covered ? (
                  <span className="rounded-full bg-accent-subtle px-2 py-0.5 text-[0.6875rem] font-semibold text-[var(--brand-emphasis)]">
                    NovelNow ออกให้
                  </span>
                ) : null}
              </span>
            </Reveal>
          ))}
        </ul>

        <p className="mt-4 border-l-2 border-[var(--brand-emphasis)] bg-muted/40 px-4 py-3 leading-7 text-(--text-secondary)">
          <strong className="font-semibold text-(--text-primary)">เราจะไม่ขอให้คุณร่วมออกค่าส่วนลด</strong>{" "}
          ทุกแคมเปญที่ทำให้ผู้อ่านจ่ายน้อยลงหรือไม่จ่ายเลย เป็นการลงทุนของ NovelNow เพื่อดึงคนอ่านเข้ามา
          ไม่ใช่การลดต้นทุนโดยผลักภาระไปที่ผู้สร้างผลงาน
        </p>
      </Reveal>

      {/* 3. */}
      <Reveal as="section" aria-labelledby="audit-title" className="mt-10 sm:mt-14">
        <p className="editorial-kicker">CHECK IT YOURSELF</p>
        <h2 id="audit-title" className="mt-2 text-2xl font-semibold">คุณตรวจสอบยอดเองได้ทุกบาท</h2>
        <InkUnderline className="mt-1 max-w-40" variant="flick" delay="0.05s" />
        <p className="mt-4 max-w-2xl leading-7 text-(--text-secondary)">
          เราไม่ขอให้คุณเชื่อตัวเลขสรุปที่เราส่งให้ เราออกแบบระบบให้คุณคำนวณเองได้ และผลลัพธ์ต้องตรงกันเป๊ะ
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-semibold">เห็นได้ตลอดเวลาในหน้าจัดการผลงาน</h3>
            <ul className="mt-3 grid gap-2.5">
              {transparency.map((item) => (
                <li key={item} className="flex gap-2.5 text-sm leading-7 text-(--text-secondary)">
                  <span aria-hidden className="mt-3 h-1 w-1 shrink-0 rounded-full bg-brand-primary" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-accent-subtle text-brand-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-semibold">ดาวน์โหลดข้อมูลดิบ (CSV)</h3>
            <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
              ทุกงวดคุณดาวน์โหลดไฟล์ที่มีทุกรายการปลดล็อกได้ หนึ่งบรรทัดคือหนึ่งครั้งที่มีคนกดปลดล็อกตอนของคุณ
              เปิดใน Excel แล้วบวกคอลัมน์เดียวก็ได้ยอดรวม ซึ่งต้องตรงกับยอดที่เราโอนทุกสตางค์
            </p>
            <p className="mt-3 text-sm leading-7 text-(--text-secondary)">
              รายการที่บันทึกแล้วจะไม่ถูกแก้ไขหรือลบตลอดไป หากมีการคืนเงิน เราจะสร้างรายการใหม่ที่เป็นยอดติดลบให้เห็นชัด
              ไม่ใช่การลบรายการเดิมทิ้ง
            </p>
          </div>
        </div>
      </Reveal>

      {/* 4. */}
      <Reveal as="section" aria-labelledby="schedule-title" className="mt-10 sm:mt-14">
        <p className="editorial-kicker">PAYOUT CYCLE</p>
        <h2 id="schedule-title" className="mt-2 text-2xl font-semibold">รอบการจ่ายเงิน</h2>
        <InkUnderline className="mt-1 max-w-32" variant="wave" delay="0.05s" />

        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {schedule.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal as="li" key={step.label} delay={index * 60} className="flex gap-4 rounded-xl bg-card/70 p-5">
                <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand-primary/30 text-brand-primary">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold">{step.label}</h3>
                  <p className="mt-1.5 text-sm leading-7 text-(--text-secondary)">{step.detail}</p>
                </div>
              </Reveal>
            );
          })}
        </ol>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <p className="rounded-xl border border-border bg-card p-5 text-sm leading-7 text-(--text-secondary)">
            <strong className="font-semibold text-(--text-primary)">ยอดขั้นต่ำ 500 บาท</strong> — หากไม่ถึง
            จะทบไปงวดถัดไปโดยอัตโนมัติ ไม่มีวันหมดอายุ
          </p>
          <p className="rounded-xl border border-border bg-card p-5 text-sm leading-7 text-(--text-secondary)">
            <strong className="font-semibold text-(--text-primary)">ช่องทาง</strong> — โอนเข้าบัญชีธนาคารที่ลงทะเบียนไว้ในระบบ
          </p>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-border">
          <p className="border-b border-border bg-muted/50 px-4 py-3 text-sm font-semibold">ตัวอย่างสลิปที่คุณจะได้รับ</p>
          <dl className="divide-y divide-border text-sm">
            {[
              ["ปลดล็อกด้วยเหรียญเติมเงิน · 8,420 ตอน", "29,470.00"],
              ["ปลดล็อกด้วยเหรียญแจกฟรี · 312 ตอน", "1,092.00"],
              ["รายการคืนเงิน · −4 ตอน", "−14.00"],
            ].map(([label, amount]) => (
              <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-3">
                <dt className="text-(--text-secondary)">{label}</dt>
                <dd className="shrink-0 font-medium tabular-nums">{amount}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 bg-muted/40 px-4 py-3 font-semibold">
              <dt>รวมก่อนหักภาษี</dt>
              <dd className="shrink-0 tabular-nums">30,548.00</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 px-4 py-3">
              <dt className="text-(--text-secondary)">หักภาษี ณ ที่จ่าย 3%</dt>
              <dd className="shrink-0 tabular-nums text-(--text-secondary)">−916.44</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 bg-accent-subtle px-4 py-3.5 font-semibold">
              <dt>ยอดโอนสุทธิ</dt>
              <dd className="shrink-0 text-lg tabular-nums">29,631.56</dd>
            </div>
          </dl>
        </div>
      </Reveal>

      {/* 5-7. */}
      <Reveal as="section" aria-labelledby="protection-title" className="mt-10 sm:mt-14">
        <p className="editorial-kicker">YOUR PROTECTIONS</p>
        <h2 id="protection-title" className="mt-2 text-2xl font-semibold">หลักประกันของคุณ</h2>
        <InkUnderline className="mt-1 max-w-36" variant="swoop" delay="0.05s" />

        <div className="mt-6 rounded-xl border border-border bg-card p-5 sm:p-6">
          <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-accent-subtle text-brand-primary">
            <Undo2 className="h-5 w-5" />
          </span>
          <h3 className="mt-4 font-semibold">การคืนเงินและรายการที่ถูกยกเลิก</h3>
          <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
            หากผู้อ่านได้รับเงินคืนหรือธนาคารเรียกเงินคืน (chargeback) รายการปลดล็อกที่เกี่ยวข้องจะถูกกลับรายการ
            และหักออกจากงวดถัดไป โดยมีหลักประกันดังนี้
          </p>
          <ul className="mt-3 grid gap-2.5">
            {refundGuarantees.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-7 text-(--text-secondary)">
                <ShieldCheck aria-hidden className="mt-1.5 h-4 w-4 shrink-0 text-brand-primary" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h3 className="font-semibold">ภาษี</h3>
            <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
              ยอดที่แสดงทั้งหมดเป็นยอดก่อนหักภาษี ณ ที่จ่าย เงินส่วนแบ่งนี้จัดเป็นค่าแห่งลิขสิทธิ์ อัตราที่ใช้คือ 3%
              ทั้งกรณีบุคคลธรรมดาและนิติบุคคล เราหักและนำส่งกรมสรรพากรให้ พร้อมออกหนังสือรับรองการหักภาษี ณ ที่จ่าย
              เป็นไฟล์อิเล็กทรอนิกส์ภายใน 7 วันหลังโอนเงิน และฉบับสรุปประจำปีภายในเดือนมกราคมของปีถัดไป
            </p>
          </div>
          <div className="rounded-xl bg-accent-subtle p-5 sm:p-6">
            <h3 className="font-semibold text-[var(--brand-emphasis)]">แจ้งล่วงหน้า 60 วัน และไม่มีผลย้อนหลัง</h3>
            <p className="mt-2 text-sm leading-7 text-(--text-secondary)">
              หากเราจะปรับสัดส่วนส่วนแบ่ง โครงสร้างการคำนวณ หรือเงื่อนไขใดในเอกสารนี้ เราจะแจ้งล่วงหน้าไม่น้อยกว่า 60 วัน
              และมีผลกับรายได้ที่เกิดขึ้นหลังวันมีผลเท่านั้น รายได้จากตอนที่เผยแพร่ไปแล้วยังคงคิดตามเงื่อนไขเดิม
              หากคุณไม่ยอมรับเงื่อนไขใหม่ คุณมีสิทธิ์ยุติความร่วมมือได้ภายในระยะเวลาแจ้งล่วงหน้า
              โดยยังได้รับเงินส่วนแบ่งที่ค้างจ่ายครบถ้วน
            </p>
          </div>
        </div>
      </Reveal>

      {/* 8. */}
      <Reveal as="section" aria-labelledby="faq-title" className="mt-10 sm:mt-14">
        <p className="editorial-kicker">FAQ</p>
        <h2 id="faq-title" className="mt-2 text-2xl font-semibold">คำถามที่พบบ่อย</h2>
        <InkUnderline className="mt-1 max-w-32" variant="flick" delay="0.05s" />

        <div className="mt-6 grid gap-2.5">
          {faqs.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-border bg-card px-5 transition-colors duration-[var(--dur-fast)] hover:border-[var(--brand-emphasis)] open:border-[var(--brand-emphasis)]">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold marker:content-['']">
                {faq.q}
                <ArrowRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-brand-primary transition-transform duration-[var(--dur-base)] ease-[var(--ease-out)] group-open:rotate-90 motion-reduce:transition-none"
                />
              </summary>
              <p className="pb-5 text-sm leading-7 text-(--text-secondary)">{faq.a}</p>
            </details>
          ))}
        </div>
      </Reveal>

      {/* 9. */}
      <Reveal as="section" aria-labelledby="contact-title" className="mt-10 sm:mt-14">
        <div className="rounded-xl bg-accent-subtle p-6 sm:p-8">
          <h2 id="contact-title" className="text-xl font-semibold">
            ติดต่อและยืนยันการเข้าร่วม
          </h2>
          <InkUnderline className="mt-1 max-w-32" variant="wave" delay="0.05s" />
          <p className="mt-4 max-w-2xl leading-7 text-(--text-secondary)">
            มีคำถามเกี่ยวกับเอกสารนี้ หรืออยากให้เราอธิบายวิธีคำนวณเพิ่มเติมก่อนตัดสินใจ ทักมาได้เลย
            ฝ่ายพันธมิตรนักเขียนและนักแปลตอบกลับภายใน 2 วันทำการ
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/creators/apply" variant="primary">
              สมัครเป็นนักเขียนหรือนักแปล
              <ArrowRight className="h-4 w-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="mailto:novelnow.com@outlook.com" variant="outline">
              <Mail className="h-4 w-4" aria-hidden />
              novelnow.com@outlook.com
            </ButtonLink>
            <ButtonLink href="https://line.me/R/ti/p/@novelnow" variant="ghost">
              <MessageCircle className="h-4 w-4" aria-hidden />
              ไลน์ออฟฟิเชียล @novelnow
            </ButtonLink>
          </div>
        </div>

        <p className="mt-5 text-xs leading-6 text-(--text-tertiary)">
          เอกสารฉบับนี้จัดทำขึ้นเพื่ออธิบายหลักการแบ่งรายได้ของ NovelNow และจะแนบท้ายเป็นส่วนหนึ่งของข้อตกลงความร่วมมือ
          ระหว่างแพลตฟอร์มกับผู้สร้างผลงาน
        </p>
      </Reveal>
    </PageShell>
  );
}
