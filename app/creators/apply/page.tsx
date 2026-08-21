"use client";

import { ArrowLeft, ArrowRight, Check, FileCheck2, PartyPopper, PenLine, UserRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { InkUnderline } from "@/components/about/ink-underline";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { PageShell } from "@/components/ui/section";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "ตัวคุณ", icon: UserRound },
  { id: 2, label: "ผลงาน", icon: PenLine },
  { id: 3, label: "ยืนยันสิทธิ์", icon: FileCheck2 },
] as const;

export default function CreatorApplyPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);

  if (submitted) {
    return (
      <PageShell className="max-w-2xl">
        <div className="mt-10 grid justify-items-center gap-4 rounded-xl border border-border bg-card p-8 text-center sm:p-12">
          <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-accent-subtle text-brand-primary">
            <PartyPopper className="h-6 w-6" />
          </span>
          <h1 className="text-2xl font-semibold">ส่งใบสมัครแล้ว</h1>
          <p className="max-w-md leading-7 text-(--text-secondary)">
            ทีมงานจะตรวจสอบและตอบกลับทางอีเมลภายใน 3 วันทำการ ระหว่างนี้คุณเข้าไปดูสตูดิโอและเตรียมข้อมูลผลงานไว้ก่อนได้
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/studio" variant="primary">
              เข้าสู่สตูดิโอนักเขียน
              <ArrowRight aria-hidden className="h-4 w-4" />
            </ButtonLink>
            <ButtonLink href="/creators" variant="outline">
              อ่านเงื่อนไขส่วนแบ่งอีกครั้ง
            </ButtonLink>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="max-w-3xl">
      <Link
        href="/creators"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปหน้าข้อเสนอส่วนแบ่งรายได้
      </Link>

      <header className="py-2">
        <p className="editorial-kicker">JOIN AS A CREATOR</p>
        <h1 className="mt-2 text-h1 font-semibold sm:text-display">สมัครเป็นนักเขียนหรือนักแปล</h1>
        <InkUnderline className="mt-1 max-w-56" />
        <p className="mt-4 max-w-2xl text-body text-(--text-secondary)">
          กรอกสามขั้นตอนสั้น ๆ ใช้เวลาไม่เกิน 5 นาที เราตรวจสอบและตอบกลับภายใน 3 วันทำการ
        </p>
      </header>

      {/* Progress rail: current step is announced, not just coloured. */}
      <ol className="mt-6 flex items-center gap-2" aria-label="ขั้นตอนการสมัคร">
        {steps.map((item, index) => {
          const done = step > item.id;
          const active = step === item.id;
          const Icon = done ? Check : item.icon;
          return (
            <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
                  done && "border-transparent bg-brand-primary text-white",
                  active && "border-[var(--brand-emphasis)] bg-accent-subtle text-[var(--brand-emphasis)]",
                  !done && !active && "border-border text-(--text-tertiary)",
                )}
              >
                <Icon aria-hidden className="h-4 w-4" />
              </span>
              <span className={cn("hidden truncate text-sm sm:block", active ? "font-semibold" : "text-(--text-tertiary)")}>
                {item.label}
              </span>
              {index < steps.length - 1 ? <span aria-hidden className="h-px min-w-4 flex-1 bg-border" /> : null}
            </li>
          );
        })}
      </ol>

      <form className="mt-6 grid gap-4" onSubmit={(event) => event.preventDefault()}>
        {step === 1 ? (
          <section aria-labelledby="step-1-title" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="step-1-title" className="font-semibold">
              ข้อมูลติดต่อ
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อ-นามสกุลจริง" hint="ใช้สำหรับทำสัญญาและโอนเงิน ไม่แสดงต่อผู้อ่าน">
                <Input placeholder="ชื่อตามบัตรประชาชน" />
              </Field>
              <Field label="นามปากกา" hint="ชื่อที่ผู้อ่านจะเห็นในทุกตอน">
                <Input placeholder="เช่น หลิวล่างเตอโหว" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="อีเมล" hint="ใช้รับผลการพิจารณาและเอกสารภาษี">
                <Input type="email" placeholder="you@example.com" />
              </Field>
              <Field label="เบอร์โทรศัพท์">
                <Input type="tel" placeholder="0X-XXX-XXXX" />
              </Field>
            </div>
            <Field label="ประเภทผู้รับเงิน" hint="มีผลกับเอกสารภาษี หักภาษี ณ ที่จ่าย 3% ทั้งสองแบบ">
              <Select defaultValue="individual">
                <option value="individual">บุคคลธรรมดา</option>
                <option value="juristic">นิติบุคคล</option>
              </Select>
            </Field>
          </section>
        ) : null}

        {step === 2 ? (
          <section aria-labelledby="step-2-title" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="step-2-title" className="font-semibold">
              ผลงานที่จะนำมาลง
            </h2>
            <Field label="คุณจะลงงานแบบไหน">
              <Select defaultValue="translation">
                <option value="translation">งานแปล</option>
                <option value="original">งานแต่งเอง</option>
                <option value="both">ทั้งสองแบบ</option>
              </Select>
            </Field>
            <Field label="ชื่อเรื่องแรกที่ตั้งใจจะลง" hint="ระบุชื่อต้นฉบับด้วยถ้าเป็นงานแปล">
              <Input placeholder="เช่น เกิดใหม่เป็นลิโป้ (原名: 重生为吕布)" />
            </Field>
            <Field label="ตัวอย่างผลงานที่เคยเผยแพร่ (ไม่บังคับ)" hint="ลิงก์เว็บ เพจ หรือไฟล์ตัวอย่าง ช่วยให้พิจารณาเร็วขึ้น">
              <Input type="url" placeholder="https://" />
            </Field>
            <Field label="ความถี่ที่ตั้งใจจะอัปเดต">
              <Select defaultValue="weekly">
                <option value="daily">ทุกวัน</option>
                <option value="weekly">สัปดาห์ละ 2–3 ตอน</option>
                <option value="biweekly">สัปดาห์ละ 1 ตอน</option>
                <option value="flexible">ยังไม่แน่นอน</option>
              </Select>
            </Field>
            <Field label="อยากบอกอะไรทีมงานเพิ่มเติมไหม (ไม่บังคับ)">
              <Textarea placeholder="เล่าเกี่ยวกับผลงานหรือประสบการณ์ของคุณสั้น ๆ" className="min-h-28" />
            </Field>
          </section>
        ) : null}

        {step === 3 ? (
          <section aria-labelledby="step-3-title" className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="step-3-title" className="font-semibold">
              ยืนยันสิทธิ์และเงื่อนไข
            </h2>
            <div className="rounded-xl bg-accent-subtle p-4">
              <p className="text-sm font-semibold text-[var(--brand-emphasis)]">สรุปข้อเสนอ</p>
              <ul className="mt-2 grid gap-1.5 text-sm leading-7 text-(--text-secondary)">
                <li>คุณได้ 70% ของราคาป้ายทุกครั้งที่ตอนถูกปลดล็อก</li>
                <li>ส่วนลดและแคมเปญทั้งหมด NovelNow ออกให้ ไม่กระทบยอดของคุณ</li>
                <li>โอนภายในวันที่ 15 ของเดือนถัดไป ขั้นต่ำ 100 บาท</li>
                <li>เปลี่ยนเงื่อนไขต้องแจ้งล่วงหน้า 60 วัน และไม่มีผลย้อนหลัง</li>
              </ul>
            </div>

            <label className="flex cursor-pointer gap-3 rounded-xl bg-muted/40 p-4">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
              />
              <span className="text-sm leading-7 text-(--text-secondary)">
                ข้าพเจ้ายืนยันว่ามีสิทธิ์เผยแพร่ผลงานที่จะนำมาลง และได้อ่านและยอมรับ{" "}
                <Link href="/creators" className="font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                  ข้อเสนอส่วนแบ่งรายได้
                </Link>
                ,{" "}
                <Link href="/terms" className="font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                  ข้อกำหนดการใช้บริการ
                </Link>{" "}
                และ{" "}
                <Link href="/copyright" className="font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                  นโยบายลิขสิทธิ์
                </Link>
              </span>
            </label>
          </section>
        ) : null}

        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}>
            <ArrowLeft aria-hidden className="h-4 w-4" />
            ย้อนกลับ
          </Button>

          {step < steps.length ? (
            <Button type="button" variant="primary" onClick={() => setStep((value) => value + 1)}>
              ถัดไป
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={!agreed} onClick={() => setSubmitted(true)}>
              ส่งใบสมัคร
            </Button>
          )}
        </div>
      </form>
    </PageShell>
  );
}
