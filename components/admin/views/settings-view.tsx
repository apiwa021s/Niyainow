"use client";

import { AlertTriangle, RotateCcw, Save } from "lucide-react";
import { useState } from "react";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";

type Settings = {
  siteName: string;
  tagline: string;
  contactEmail: string;
  seoDescription: string;
  registrationOpen: boolean;
  maintenanceMode: boolean;
  commentMode: "open" | "review" | "closed";
  submissionsOpen: boolean;
  revenueSharePercent: string;
  minPayoutTHB: string;
  facebook: string;
  line: string;
};

const DEFAULTS: Settings = {
  siteName: "NiyaiNow",
  tagline: "นิยายใหม่ อัปเดตไว อ่านได้ทันที",
  contactEmail: "support@niyainow.test",
  seoDescription: "แพลตฟอร์มอ่านนิยายสำหรับตลาดไทย พร้อมค้นหา คลังส่วนตัว ประวัติ และ reader controls",
  registrationOpen: true,
  maintenanceMode: false,
  commentMode: "review",
  submissionsOpen: true,
  revenueSharePercent: "50",
  minPayoutTHB: "1000",
  facebook: "https://facebook.com/niyainow",
  line: "@niyainow"
};

/** สวิตช์เปิด/ปิดพร้อมคำอธิบายผลลัพธ์ — ต้องบอกเสมอว่ากดแล้วผู้ใช้เจออะไร */
function Toggle({
  label,
  description,
  checked,
  onChange,
  tone = "default"
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  tone?: "default" | "danger";
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-[12px] border p-3 ${
        tone === "danger" && checked ? "border-destructive/40 bg-destructive/5" : "border-border"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
      />
      <span className="min-w-0 text-sm">
        <span className="font-medium">{label}</span>
        <span className="block text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

export function SettingsView() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((current) => ({ ...current, [key]: value }));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-4">
        <Panel title="ข้อมูลเว็บไซต์" description="ใช้ในหัวเว็บ อีเมลอัตโนมัติ และผลการค้นหา">
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อเว็บไซต์">
                <Input value={settings.siteName} onChange={(event) => update("siteName", event.target.value)} />
              </Field>
              <Field label="อีเมลติดต่อ">
                <Input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(event) => update("contactEmail", event.target.value)}
                />
              </Field>
            </div>
            <Field label="สโลแกน" hint="แสดงต่อท้ายชื่อเว็บในผลการค้นหา">
              <Input value={settings.tagline} onChange={(event) => update("tagline", event.target.value)} />
            </Field>
            <Field label="คำอธิบายสำหรับ SEO" hint="ความยาวที่เหมาะสมคือ 120–160 ตัวอักษร">
              <Textarea
                value={settings.seoDescription}
                onChange={(event) => update("seoDescription", event.target.value)}
                className="min-h-20"
              />
              <p className="tabular text-xs text-muted-foreground">{settings.seoDescription.length} ตัวอักษร</p>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="เพจ Facebook">
                <Input value={settings.facebook} onChange={(event) => update("facebook", event.target.value)} />
              </Field>
              <Field label="LINE Official">
                <Input value={settings.line} onChange={(event) => update("line", event.target.value)} />
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="การเปิดรับผู้ใช้และเนื้อหา">
          <div className="grid gap-3">
            <Toggle
              label="เปิดให้สมัครสมาชิกใหม่"
              description="ปิดแล้วผู้ใช้เดิมยังเข้าได้ตามปกติ แต่หน้าสมัครจะแสดงข้อความว่าปิดรับชั่วคราว"
              checked={settings.registrationOpen}
              onChange={(value) => update("registrationOpen", value)}
            />
            <Toggle
              label="เปิดรับเรื่องจากทีมแปล"
              description="ปิดแล้วปุ่มส่งเรื่องในหน้าโปรไฟล์ทีมแปลจะถูกซ่อน"
              checked={settings.submissionsOpen}
              onChange={(value) => update("submissionsOpen", value)}
            />
            <div className="grid gap-1.5">
              <Label>โหมดคอมเมนต์</Label>
              <Select
                value={settings.commentMode}
                onChange={(event) => update("commentMode", event.target.value as Settings["commentMode"])}
              >
                <option value="open">แสดงทันทีหลังโพสต์</option>
                <option value="review">ต้องผ่านการตรวจก่อนแสดง</option>
                <option value="closed">ปิดคอมเมนต์ทั้งเว็บ</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                โหมด “ต้องผ่านการตรวจ” จะทำให้คิวในหน้าคอมเมนต์ยาวขึ้น ควรมีผู้ตรวจอย่างน้อย 2 คนต่อวัน
              </p>
            </div>
          </div>
        </Panel>

        <Panel title="รายได้และการจ่ายเงิน" description="ค่าเริ่มต้นสำหรับทีมแปลที่ไม่ได้ทำสัญญาเฉพาะ">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ส่วนแบ่งรายได้ของทีมแปล (%)">
              <Input
                type="number"
                min={0}
                max={100}
                value={settings.revenueSharePercent}
                onChange={(event) => update("revenueSharePercent", event.target.value)}
                className="tabular"
              />
            </Field>
            <Field label="ยอดขั้นต่ำในการถอน (บาท)">
              <Input
                type="number"
                min={0}
                value={settings.minPayoutTHB}
                onChange={(event) => update("minPayoutTHB", event.target.value)}
                className="tabular"
              />
            </Field>
          </div>
        </Panel>

        <Panel title="พื้นที่อันตราย" description="คำสั่งเหล่านี้กระทบผู้ใช้ทั้งเว็บ ใช้เมื่อจำเป็นเท่านั้น">
          <div className="grid gap-3">
            <Toggle
              label="เปิดโหมดปิดปรับปรุง"
              description="ผู้อ่านทุกคนจะเห็นหน้าปิดปรับปรุงแทนเนื้อหา ยกเว้นทีมงานที่ล็อกอินอยู่"
              checked={settings.maintenanceMode}
              onChange={(value) => update("maintenanceMode", value)}
              tone="danger"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="h-4 w-4" />
                คืนค่าเริ่มต้นทั้งหมด
              </Button>
              <Button variant="ghost" className="text-destructive" onClick={() => setConfirmPurge(true)}>
                <AlertTriangle className="h-4 w-4" />
                ล้างแคชหน้าเว็บทั้งหมด
              </Button>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid content-start gap-4">
        <Panel title="บันทึกการตั้งค่า">
          <p className="mb-4 text-sm text-muted-foreground">
            การตั้งค่าจะมีผลกับผู้ใช้ทุกคนทันทีหลังกดบันทึก และถูกบันทึกลงบันทึกกิจกรรมพร้อมชื่อผู้แก้ไข
          </p>
          <div className="grid gap-2">
            <Button onClick={() => toast({ tone: "success", message: "บันทึกการตั้งค่าเว็บไซต์แล้ว" })}>
              <Save className="h-4 w-4" />
              บันทึกการตั้งค่า
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSettings(DEFAULTS);
                toast({ tone: "info", message: "ยกเลิกการเปลี่ยนแปลงที่ยังไม่ได้บันทึกแล้ว" });
              }}
            >
              ยกเลิกการเปลี่ยนแปลง
            </Button>
          </div>
        </Panel>

        <Panel title="สถานะระบบ">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">เวอร์ชันระบบ</dt>
              <dd className="font-medium">0.1.0 (เดโม)</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">แหล่งข้อมูล</dt>
              <dd className="font-medium">Mock data ในโปรเจกต์</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ระบบชำระเงิน</dt>
              <dd className="font-medium">ยังไม่เชื่อมต่อ</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={() => {
          setSettings(DEFAULTS);
          toast({ tone: "info", message: "คืนค่าการตั้งค่าเป็นค่าเริ่มต้นแล้ว" });
        }}
        title="คืนค่าการตั้งค่าทั้งหมด?"
        description="ค่าทุกช่องในหน้านี้จะกลับไปเป็นค่าเริ่มต้นของระบบ การตั้งค่าเฉพาะเรื่องและเฉพาะทีมแปลไม่ได้รับผลกระทบ"
        confirmLabel="คืนค่าเริ่มต้น"
        tone="danger"
      />

      <ConfirmDialog
        open={confirmPurge}
        onClose={() => setConfirmPurge(false)}
        onConfirm={() => toast({ tone: "success", message: "สั่งล้างแคชแล้ว หน้าเว็บจะถูกสร้างใหม่ในไม่กี่นาที" })}
        title="ล้างแคชหน้าเว็บทั้งหมด?"
        description="ในช่วงไม่กี่นาทีแรกหน้าเว็บจะโหลดช้าลงเพราะต้องสร้างใหม่ทั้งหมด ควรทำนอกช่วงเวลาที่คนอ่านเยอะ (18:00–23:00 น.)"
        confirmLabel="ล้างแคช"
        tone="danger"
      />
    </div>
  );
}
