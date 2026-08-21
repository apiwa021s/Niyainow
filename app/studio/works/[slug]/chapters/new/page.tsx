"use client";

import { ArrowLeft, Clock, Coins, Eye, Save, Send } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

import { StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { whole } from "@/components/studio/mock-data";

const READING_SPEED_WPM = 220;

export default function NewChapterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [body, setBody] = useState("");
  const [access, setAccess] = useState<"free" | "paid">("paid");

  // Thai has no word spaces, so characters are the honest unit here; the
  // word figure is a rough estimate shown only to gauge chapter length.
  const characters = body.length;
  const words = Math.round(characters / 3.5);
  const minutes = Math.max(1, Math.round(words / READING_SPEED_WPM));

  return (
    <>
      <Link
        href={`/studio/works/${slug}`}
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปหน้าเรื่อง
      </Link>

      <StudioPageHeader
        eyebrow="NEW CHAPTER"
        title="เขียนตอนใหม่"
        description="ระบบบันทึกร่างอัตโนมัติระหว่างพิมพ์ ตอนจะยังไม่มีใครเห็นจนกว่าคุณจะกดเผยแพร่หรือถึงเวลาที่ตั้งไว้"
      />

      <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]" onSubmit={(event) => event.preventDefault()}>
        <div className="grid content-start gap-4">
          <StudioPanel title="เนื้อหาตอน">
            <div className="grid gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                <Field label="เลขตอน">
                  <Input type="number" defaultValue={2669} min={0} />
                </Field>
                <Field label="ชื่อตอน">
                  <Input placeholder="เช่น ศึกชิงเมืองด่านเหนือ" maxLength={150} />
                </Field>
              </div>

              <div className="grid gap-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">เนื้อเรื่อง</span>
                  <span className="text-xs tabular-nums text-(--text-tertiary)">
                    {whole.format(characters)} ตัวอักษร · ประมาณ {whole.format(words)} คำ · อ่าน ~{minutes} นาที
                  </span>
                </div>
                <textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="เริ่มพิมพ์ตอนของคุณที่นี่…"
                  className="min-h-140 w-full rounded-[6px] border border-border bg-card px-4 py-3 text-base leading-9 transition-colors duration-[var(--dur-fast)] placeholder:text-(--text-secondary) hover:border-[var(--brand-emphasis)]"
                />
                <p className="text-xs text-muted-foreground">
                  วางจากโปรแกรมอื่นได้เลย ระบบจะเก็บย่อหน้าไว้ให้ และตัดสคริปต์หรือโค้ดแปลกปลอมออกอัตโนมัติ
                </p>
              </div>

              <Field label="หมายเหตุท้ายตอน (ไม่บังคับ)" hint="ข้อความสั้น ๆ ถึงคนอ่าน เช่น กำหนดอัปเดตตอนหน้า">
                <Input placeholder="เช่น ตอนหน้าอัปเดตวันศุกร์นี้" maxLength={200} />
              </Field>
            </div>
          </StudioPanel>
        </div>

        <div className="grid content-start gap-4">
          <StudioPanel title="การเข้าถึง">
            <div className="grid gap-4 p-5">
              <div className="grid gap-2">
                {(
                  [
                    { value: "free", label: "อ่านฟรี", hint: "ทุกคนเปิดอ่านได้ทันที" },
                    { value: "paid", label: "ปลดล็อกด้วยเหรียญ", hint: "คุณได้ 70% ของราคาป้ายทุกครั้งที่ถูกปลดล็อก" },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={
                      access === option.value
                        ? "flex cursor-pointer gap-3 rounded-xl border border-[var(--brand-emphasis)] bg-accent-subtle p-4"
                        : "flex cursor-pointer gap-3 rounded-xl border border-border bg-card p-4 hover:border-[var(--brand-emphasis)]"
                    }
                  >
                    <input
                      type="radio"
                      name="access"
                      value={option.value}
                      checked={access === option.value}
                      onChange={() => setAccess(option.value)}
                      className="mt-0.5 h-4.5 w-4.5 shrink-0 accent-[var(--brand-primary)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="mt-0.5 block text-xs leading-6 text-(--text-secondary)">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </div>

              {access === "paid" ? (
                <>
                  <Field label="ราคาป้ายต่อตอน">
                    <Select defaultValue="5">
                      <option value="3">3 เหรียญ</option>
                      <option value="5">5 เหรียญ</option>
                      <option value="10">10 เหรียญ</option>
                      <option value="15">15 เหรียญ</option>
                    </Select>
                  </Field>
                  <p className="flex gap-2 rounded-[8px] bg-muted/40 p-3 text-xs leading-6 text-(--text-secondary)">
                    <Coins aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
                    ส่วนแบ่งของคุณ 3.50 บาทต่อการปลดล็อกหนึ่งครั้ง คิดจากราคาป้ายเสมอ แม้ผู้อ่านจะใช้เหรียญแจกฟรีหรืออยู่ในช่วงโปรโมชั่น
                  </p>
                </>
              ) : null}
            </div>
          </StudioPanel>

          <StudioPanel title="กำหนดเผยแพร่">
            <div className="grid gap-4 p-5">
              <Field label="เวลาเผยแพร่">
                <Select defaultValue="now">
                  <option value="now">เผยแพร่ทันทีเมื่อกดยืนยัน</option>
                  <option value="schedule">ตั้งเวลาเผยแพร่</option>
                </Select>
              </Field>
              <Field label="วันและเวลา" hint="ใช้เมื่อเลือกตั้งเวลา ระบบจะเผยแพร่ให้อัตโนมัติ">
                <Input type="datetime-local" />
              </Field>
              <p className="flex gap-2 text-xs leading-6 text-(--text-tertiary)">
                <Clock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
                ผู้ติดตามจะได้รับแจ้งเตือนตอนใหม่ทันทีที่เผยแพร่
              </p>
            </div>
          </StudioPanel>

          <div className="grid gap-2">
            <Button type="submit" variant="primary">
              <Send aria-hidden className="h-4 w-4" />
              เผยแพร่ตอนนี้
            </Button>
            <Button type="button" variant="outline">
              <Save aria-hidden className="h-4 w-4" />
              บันทึกร่าง
            </Button>
            <Button type="button" variant="ghost">
              <Eye aria-hidden className="h-4 w-4" />
              ดูตัวอย่างแบบที่ผู้อ่านเห็น
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
