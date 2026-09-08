"use client";

import Link from "next/link";
import { Bot, Languages, Plus, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Panel, StatCard } from "@/components/admin/admin-ui";
import { AiTranslationVisual } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
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

    <Panel title="เริ่มแปลอัตโนมัติ" description="ระบบสร้าง Profile จากชื่อเรื่องและเรื่องย่อ เลือก AI model แล้วแปลต่อเนื่องให้เอง">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-stretch">
        <form action={createWorkspace} className="grid content-center gap-4 md:grid-cols-[1fr_150px]">
          <Field label="เรื่องที่นำเข้า"><Select name="importSourceId" required defaultValue=""><option value="" disabled>เลือกเรื่อง</option>{data.sources.map((source) => <option key={source.id} value={source.id}>{source.title} ({source.sourceLanguage})</option>)}</Select></Field>
          <Field label="ภาษาปลายทาง"><Input name="targetLanguage" defaultValue="th" required placeholder="th" /></Field>
          <Button type="submit" loading={busy} className="md:col-span-2 md:justify-self-start"><Plus className="h-4 w-4" />สร้างและเริ่มแปล</Button>
          <p className="text-xs leading-relaxed text-muted-foreground md:col-span-2">ระบบสร้าง model presets และ prompt ให้อัตโนมัติ ใช้เพียง <code>AI_TRANSLATION_API_KEY</code> จาก environment ของ server</p>
        </form>
        <AiTranslationVisual active={busy} />
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
