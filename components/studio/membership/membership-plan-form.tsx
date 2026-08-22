"use client";

import { Check, CircleAlert, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

type Benefit = { id: string; slug: string; nameTh: string; nameEn: string };
type Plan = { id: string; name: string; description: string | null; priceMinor: number; currency: string; earlyAccessChapterCount: number; status: "DRAFT" | "ACTIVE" | "INACTIVE"; benefits: Benefit[] };

export function MembershipPlanForm({ initialPlan, benefits }: { initialPlan: Plan | null; benefits: Benefit[] }) {
  const [plan, setPlan] = useState(initialPlan);
  const [name, setName] = useState(initialPlan?.name ?? "");
  const [description, setDescription] = useState(initialPlan?.description ?? "");
  const [priceMinor, setPriceMinor] = useState(initialPlan?.priceMinor ?? 5900);
  const [earlyCount, setEarlyCount] = useState(initialPlan?.earlyAccessChapterCount ?? 3);
  const [benefitIds, setBenefitIds] = useState(initialPlan?.benefits.map((benefit) => benefit.id) ?? []);
  const [active, setActive] = useState(initialPlan?.status === "ACTIVE");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save() {
    setSaving(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/studio/membership", { method: plan ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim() || null, priceMinor, currency: "THB", earlyAccessChapterCount: earlyCount, benefitIds, active }) });
      const payload = await response.json() as { data?: Plan; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "บันทึก Membership ไม่สำเร็จ");
      setPlan({ ...payload.data, benefits: benefits.filter((benefit) => benefitIds.includes(benefit.id)) });
      setMessage(active ? "บันทึกและเปิด Membership แล้ว" : "บันทึก Membership เป็นฉบับร่างแล้ว");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "บันทึก Membership ไม่สำเร็จ"); }
    finally { setSaving(false); }
  }

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
    <section className="rounded-[8px] border border-border bg-card p-4 sm:p-6"><h2 className="font-semibold">แผนสมาชิกแบบ Single Tier</h2><p className="mt-1 text-sm text-(--text-secondary)">นักเขียนหนึ่งคนมีแผนที่เปิดใช้งานได้หนึ่งแผน ราคาเรียกเก็บรายเดือนผ่าน Stripe</p><div className="mt-5 grid gap-5"><Field label="ชื่อ Membership"><Input value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></Field><Field label="คำอธิบาย"><Textarea value={description} maxLength={2000} rows={6} onChange={(event) => setDescription(event.target.value)} /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="ราคารายเดือน (บาท)"><Input type="number" min={1} value={priceMinor / 100} onChange={(event) => setPriceMinor(Math.max(1, Math.round(Number(event.target.value) * 100)))} /></Field><Field label="จำนวนตอน Early Access"><Input type="number" min={0} max={100} value={earlyCount} onChange={(event) => setEarlyCount(Number(event.target.value))} /></Field></div><fieldset><legend className="text-sm font-semibold">สิทธิประโยชน์</legend><div className="mt-3 grid gap-2 sm:grid-cols-2">{benefits.map((benefit) => { const selected = benefitIds.includes(benefit.id); return <button key={benefit.id} type="button" aria-pressed={selected} onClick={() => setBenefitIds((current) => selected ? current.filter((id) => id !== benefit.id) : [...current, benefit.id])} className={cn("flex min-h-11 items-center gap-2 rounded-[6px] border px-3 text-left text-sm", selected ? "border-[var(--brand-primary)] bg-accent-subtle" : "border-border")}><span className={cn("grid h-5 w-5 place-items-center rounded-[4px] border", selected && "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white")}>{selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}</span>{benefit.nameTh}</button>; })}</div></fieldset><label className="flex min-h-11 items-center gap-3 rounded-[6px] border border-border p-3 text-sm"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} /><span><strong className="block">เปิดรับสมาชิก</strong><span className="text-xs text-(--text-secondary)">เมื่อเปิดแล้ว Reader จะสมัครผ่าน Stripe Checkout ได้</span></span></label><div aria-live="polite" className="min-h-5 text-sm">{message ? <span className="inline-flex items-center gap-1.5 text-[var(--success)]"><Check className="h-4 w-4" aria-hidden />{message}</span> : null}{error ? <span role="alert" className="inline-flex items-center gap-1.5 text-destructive"><CircleAlert className="h-4 w-4" aria-hidden />{error}</span> : null}</div><Button type="button" onClick={() => void save()} loading={saving} disabled={!name.trim() || priceMinor <= 0}><Save className="h-4 w-4" aria-hidden />บันทึก Membership</Button></div></section>
    <aside className="rounded-[8px] border border-border bg-card p-5 lg:sticky lg:top-4 lg:self-start"><p className="editorial-kicker">MEMBER PREVIEW</p><h2 className="mt-3 text-lg font-semibold">{name.trim() || "ชื่อ Membership"}</h2><p className="mt-2 whitespace-pre-line text-sm leading-6 text-(--text-secondary)">{description.trim() || "คำอธิบายสิทธิพิเศษสำหรับสมาชิกจะแสดงตรงนี้"}</p><p className="mt-5 text-2xl font-semibold tabular-nums">฿{(priceMinor / 100).toLocaleString("th-TH")}<span className="ml-1 text-xs font-normal text-(--text-tertiary)">/ เดือน</span></p><ul className="mt-4 grid gap-2 text-sm">{benefits.filter((benefit) => benefitIds.includes(benefit.id)).map((benefit) => <li key={benefit.id} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" aria-hidden />{benefit.nameTh}</li>)}</ul></aside>
  </div>;
}
