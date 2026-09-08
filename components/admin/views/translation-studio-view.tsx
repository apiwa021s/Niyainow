"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Languages, Sparkles, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Panel, StatCard } from "@/components/admin/admin-ui";
import { AiTranslationVisual } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
import { TranslationSetupSteps } from "@/components/admin/translation-setup-steps";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { AUTOMATIC_TRANSLATION_ROUTING } from "@/lib/domain/translation-ai-routing";
import type { getTranslationStudio } from "@/services/translation-service";

type Data = Awaited<ReturnType<typeof getTranslationStudio>>;

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init.headers } });
  const body = await response.json().catch(() => null) as { error?: { message?: string }; workspace?: { id: string } } | null;
  if (!response.ok) throw new Error(body?.error?.message || `HTTP ${response.status}`);
  return body;
}

export function TranslationStudioView({ data }: { data: Data }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const selectedSource = data.sources.find((source) => source.id === selectedSourceId);
  const totalChapters = data.workspaces.reduce((sum, row) => sum + row.chapterCount, 0);
  const approvedChapters = data.workspaces.reduce((sum, row) => sum + row.approvedCount, 0);
  const totalCost = data.workspaces.reduce((sum, row) => sum + row.jobCostMicros, 0) / 1_000_000;

  async function createWorkspace(formData: FormData) {
    setBusy(true); setError("");
    try {
      const result = await requestJson("/api/admin/translation/workspaces", { method: "POST", body: JSON.stringify({ importSourceId: formData.get("importSourceId"), targetLanguage: formData.get("targetLanguage") }) });
      if (result?.workspace?.id) router.push(`/admin/translation/${result.workspace.id}`);
      else router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "สร้าง Workspace ไม่สำเร็จ"); }
    finally { setBusy(false); }
  }

  return <div className="grid gap-5">
    {error ? <div role="alert" className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Workspace" value={data.workspaces.length} icon={<Languages className="h-5 w-5" />} />
      <StatCard label="ตอนที่อนุมัติ" value={`${approvedChapters.toLocaleString("th-TH")} / ${totalChapters.toLocaleString("th-TH")}`} icon={<Bot className="h-5 w-5" />} />
      <StatCard label="ค่าใช้จ่าย AI ที่บันทึก" value={`$${totalCost.toFixed(4)}`} icon={<WalletCards className="h-5 w-5" />} />
    </div>

    <Panel title="เตรียมงานแปลเรื่องใหม่" description="ทำทีละขั้นเพื่อให้ Profile และตอนที่ส่งแปลถูกต้องก่อนเริ่มใช้ AI">
      <div className="grid gap-6">
        <TranslationSetupSteps activeStep={1} completedThrough={0} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-stretch">
          <div className="grid gap-4">
            <div className="rounded-[14px] border border-border bg-muted/35 p-4">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"><BookOpen className="h-5 w-5" aria-hidden /></span>
                <div><h3 className="font-semibold">1. เลือกต้นฉบับ</h3><p className="text-sm text-muted-foreground">ระบบจะใช้เฉพาะชื่อเรื่องและเรื่องย่อเพื่อสร้าง Default Profile ก่อน ยังไม่ส่งตอนเข้าคิวแปล</p></div>
              </div>
              <form action={createWorkspace} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]">
                <Field label="เรื่องที่นำเข้า">
                  <Select name="importSourceId" required value={selectedSourceId} onChange={(event) => setSelectedSourceId(event.target.value)}>
                    <option value="" disabled>เลือกเรื่อง</option>
                    {data.sources.map((source) => <option key={source.id} value={source.id}>{source.title} ({source.sourceLanguage})</option>)}
                  </Select>
                </Field>
                <Field label="ภาษาปลายทาง" hint="รหัสภาษา เช่น th"><Input name="targetLanguage" defaultValue="th" required placeholder="th" /></Field>
                {selectedSource ? (
                  <div className="grid gap-2 rounded-[12px] border border-border bg-card p-4 md:col-span-2">
                    <div className="flex flex-wrap items-center justify-between gap-2"><strong className="text-sm">{selectedSource.title}</strong><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{selectedSource.chapterCount.toLocaleString("th-TH")} ตอน</span></div>
                    <p className="line-clamp-4 text-sm leading-relaxed text-muted-foreground">{selectedSource.synopsis?.trim() || "ต้นฉบับนี้ยังไม่มีเรื่องย่อ ระบบจะสร้าง Profile แบบทั่วไปให้ตรวจแก้ก่อน"}</p>
                    <p className="text-xs font-medium text-[var(--brand-emphasis)]"><Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />ข้อมูลที่จะนำไปวิเคราะห์: ชื่อเรื่อง + เรื่องย่อ</p>
                  </div>
                ) : null}
                <Button type="submit" loading={busy} disabled={!selectedSourceId} className="md:col-span-2 md:justify-self-start"><Sparkles className="h-4 w-4" />วิเคราะห์และสร้าง Default Profile<ArrowRight className="h-4 w-4" /></Button>
              </form>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">หลังสร้าง Profile ระบบจะพาไปขั้นตรวจแก้ก่อน จากนั้นคุณจึงเลือกตอนและเริ่มแปล ระบบเลือก model และ prompt ให้อัตโนมัติจาก <code>AI_TRANSLATION_API_KEY</code></p>
          </div>
          <AiTranslationVisual active={busy} />
        </div>
      </div>
    </Panel>

    <Panel title="งานแปลทั้งหมด" bodyClassName="p-0">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">เรื่อง</th><th className="px-4 py-3">ภาษา</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ความคืบหน้า</th><th className="px-4 py-3">ค่าใช้จ่าย</th><th className="px-4 py-3" /></tr></thead><tbody>
        {data.workspaces.map((row) => <tr key={row.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 font-semibold"><Link className="hover:underline" href={`/admin/translation/${row.id}`}>{row.title}</Link></td><td className="px-4 py-3">{row.sourceLanguage} → {row.targetLanguage}</td><td className="px-4 py-3"><StatusPill label={row.status} tone={row.status === "COMPLETED" ? "success" : row.status === "TRANSLATING" ? "info" : "neutral"} /></td><td className="px-4 py-3 tabular">{row.approvedCount} / {row.chapterCount}</td><td className="px-4 py-3 tabular">${(row.jobCostMicros / 1_000_000).toFixed(4)}</td><td className="px-4 py-3 text-right"><Link className="font-semibold text-[var(--brand-light-on-light)] hover:underline" href={`/admin/translation/${row.id}`}>เปิด</Link></td></tr>)}
        {!data.workspaces.length ? <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">ยังไม่มี Translation Workspace</td></tr> : null}
      </tbody></table></div>
    </Panel>

    <Panel title="AI routing อัตโนมัติ" description="ระบบเลือกโมเดลตามชนิดงาน ไม่ต้องตั้งค่า model หรือ prompt เอง" bodyClassName="p-0">
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">งาน</th><th className="px-4 py-3">Model</th><th className="px-4 py-3">เหตุผล</th></tr></thead><tbody>
        {AUTOMATIC_TRANSLATION_ROUTING.map((route) => <tr key={route.task} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 font-medium">{route.label}</td><td className="px-4 py-3">{route.modelLabel}</td><td className="px-4 py-3 text-muted-foreground">{route.reason}</td></tr>)}
      </tbody></table></div>
    </Panel>
  </div>;
}
