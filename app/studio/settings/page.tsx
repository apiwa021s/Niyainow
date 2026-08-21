import type { Metadata } from "next";
import { BadgeCheck, ImagePlus, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { studioProfile } from "@/components/studio/mock-data";
import { StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";

export const metadata: Metadata = { title: "ตั้งค่านักเขียน" };

const notifications = [
  { label: "มีคนติดตามผลงานของฉันเพิ่ม", defaultOn: true },
  { label: "มีรีวิวใหม่ในเรื่องของฉัน", defaultOn: true },
  { label: "สรุปยอดรายวัน", defaultOn: false },
  { label: "แจ้งเตือนเมื่อโอนเงินงวดใหม่", defaultOn: true },
] as const;

export default function StudioSettingsPage() {
  return (
    <>
      <StudioPageHeader
        eyebrow="SETTINGS"
        title="ตั้งค่านักเขียน"
        description="ข้อมูลที่ผู้อ่านเห็นในหน้าโปรไฟล์ของคุณ และการแจ้งเตือนที่คุณอยากได้รับ"
      />

      <div className="grid gap-4">
        <StudioPanel title="โปรไฟล์สาธารณะ" description="ข้อมูลส่วนนี้แสดงต่อผู้อ่านทุกคน">
          <div className="grid gap-4 p-5">
            <div className="flex flex-wrap items-center gap-4">
              <span
                aria-hidden
                className="grid h-20 w-20 shrink-0 place-items-center rounded-full border border-dashed border-border bg-muted/40 text-(--text-tertiary)"
              >
                <ImagePlus className="h-5 w-5" />
              </span>
              <div>
                <Button type="button" variant="outline">
                  เปลี่ยนรูปโปรไฟล์
                </Button>
                <p className="mt-2 text-xs text-(--text-tertiary)">สี่เหลี่ยมจัตุรัส อย่างน้อย 400×400 พิกเซล</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="นามปากกา" hint="ชื่อที่ติดอยู่กับทุกตอนที่คุณเผยแพร่">
                <Input defaultValue={studioProfile.penName} maxLength={60} />
              </Field>
              <Field label="ชื่อผู้ใช้" hint="ใช้เป็นลิงก์โปรไฟล์ เปลี่ยนได้ปีละครั้ง">
                <Input defaultValue={studioProfile.handle} maxLength={30} />
              </Field>
            </div>

            <Field label="แนะนำตัว" hint="เล่าสั้น ๆ ว่าคุณแปลหรือเขียนแนวไหน ช่วยให้ผู้อ่านตัดสินใจกดติดตาม">
              <Textarea placeholder="เช่น แปลนิยายจีนแนวกำลังภายในและเกิดใหม่ อัปเดตทุกวันจันทร์–ศุกร์" className="min-h-28" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ลิงก์ติดต่อ (ไม่บังคับ)">
                <Input type="url" placeholder="https://" />
              </Field>
              <Field label="ตารางอัปเดตที่ประกาศไว้ (ไม่บังคับ)">
                <Input placeholder="เช่น จันทร์ พุธ ศุกร์ 20:00" />
              </Field>
            </div>
          </div>
        </StudioPanel>

        <StudioPanel title="สถานะบัญชีนักเขียน">
          <div className="grid gap-3 p-5">
            <div className="flex items-center gap-3 rounded-xl bg-accent-subtle p-4">
              <BadgeCheck aria-hidden className="h-5 w-5 shrink-0 text-brand-primary" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">ยืนยันตัวตนแล้ว</p>
                <p className="mt-0.5 text-xs text-(--text-secondary)">
                  เข้าร่วมเมื่อ {studioProfile.joinedAt} · บทบาท {studioProfile.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-border p-4">
              <ShieldCheck aria-hidden className="h-5 w-5 shrink-0 text-emerald-500" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">ยอมรับข้อเสนอส่วนแบ่งรายได้ v1.0 แล้ว</p>
                <p className="mt-0.5 text-xs text-(--text-secondary)">
                  <Link href="/creators" className="font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                    อ่านเอกสารฉบับเต็ม
                  </Link>{" "}
                  · หากมีการแก้ไข เราจะแจ้งล่วงหน้า 60 วัน
                </p>
              </div>
            </div>
          </div>
        </StudioPanel>

        <StudioPanel title="การแจ้งเตือน">
          <ul className="divide-y divide-border">
            {notifications.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="min-w-0 text-sm text-(--text-secondary)">{item.label}</span>
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
                  <span className="sr-only">{item.label}</span>
                  <input type="checkbox" defaultChecked={item.defaultOn} className="h-5 w-5 accent-[var(--brand-primary)]" />
                </label>
              </li>
            ))}
          </ul>
        </StudioPanel>

        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="primary">
            บันทึกการเปลี่ยนแปลง
          </Button>
          <Button type="button" variant="ghost">
            ยกเลิก
          </Button>
        </div>
      </div>
    </>
  );
}
