"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Database, Languages, LoaderCircle, Sparkles, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Panel, StatCard } from "@/components/admin/admin-ui";
import { AiTranslationVisual } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
import { TranslationSetupSteps } from "@/components/admin/translation-setup-steps";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { AUTOMATIC_TRANSLATION_ROUTING } from "@/lib/domain/translation-ai-routing";
import type { getTranslationStudio } from "@/services/translation-service";

type Data = Awaited<ReturnType<typeof getTranslationStudio>>;

type ProfileStage = { stage: string; label: string; modelName: string };

export function TranslationStudioView({ data }: { data: Data }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [profileStage, setProfileStage] = useState<ProfileStage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const selectedSource = data.sources.find((source) => source.id === selectedSourceId);
  const totalChapters = data.workspaces.reduce((sum, row) => sum + row.chapterCount, 0);
  const approvedChapters = data.workspaces.reduce((sum, row) => sum + row.approvedCount, 0);
  const totalCost = data.workspaces.reduce((sum, row) => sum + row.jobCostMicros, 0) / 1_000_000;

  useEffect(() => {
    if (!busy) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const formData = new FormData(event.currentTarget);
    setError("");
    setElapsedSeconds(0);
    setProfileStage({ stage: "CONNECTING", label: "กำลังเตรียมข้อมูลและเชื่อมต่อ AI", modelName: "Automatic routing" });
    setBusy(true);
    try {
      // Give the browser one frame to paint the processing overlay before the long request starts.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const response = await fetch("/api/admin/translation/workspaces", {
        method: "POST",
        headers: { accept: "application/x-ndjson", "content-type": "application/json" },
        body: JSON.stringify({ importSourceId: formData.get("importSourceId"), targetLanguage: formData.get("targetLanguage") }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(body?.error?.message || `HTTP ${response.status}`);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let workspaceId = "";
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type: string; stage?: string; label?: string; modelName?: string; workspace?: { id: string }; error?: { message?: string } };
          if (event.type === "stage" && event.stage && event.label && event.modelName) setProfileStage({ stage: event.stage, label: event.label, modelName: event.modelName });
          if (event.type === "error") throw new Error(event.error?.message || "สร้าง AI Profile ไม่สำเร็จ");
          if (event.type === "complete") workspaceId = event.workspace?.id ?? "";
        }
        if (done) break;
      }
      if (!workspaceId) throw new Error("AI ทำงานเสร็จแต่ไม่ได้คืน Workspace");
      router.push(`/admin/translation/${workspaceId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "สร้าง Workspace ไม่สำเร็จ"); }
    finally { setBusy(false); setProfileStage(null); setElapsedSeconds(0); }
  }

  return <div className="grid gap-5">
    {busy ? (
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ai-profile-progress-title">
        <div className="w-full max-w-2xl rounded-[22px] border border-[var(--brand-primary)]/30 bg-card p-5 shadow-2xl sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-emphasis)]">AI Profile Pipeline</p>
              <h2 id="ai-profile-progress-title" className="mt-1 text-xl font-bold">กำลังวิเคราะห์ “{selectedSource?.title ?? "ต้นฉบับ"}”</h2>
              <p className="mt-1 text-sm text-muted-foreground">กรุณาเปิดหน้านี้ไว้จนสร้าง Profile เสร็จ ระบบจะแสดงขั้นตอนจากเซิร์ฟเวอร์แบบสด</p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-emphasis)]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />{elapsedSeconds}s</span>
          </div>
          <AiTranslationVisual active stage={profileStage?.stage} stageLabel={profileStage?.label} modelName={profileStage?.modelName} />
          <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-muted/55 px-3 py-2 text-xs text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
            Request กำลังทำงานจริง · ระบบจะไม่สร้าง Profile จำลองเมื่อ AI ล้มเหลว
          </div>
        </div>
      </div>
    ) : null}
    {error ? <div role="alert" className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Workspace" value={data.workspaces.length} icon={<Languages className="h-5 w-5" />} />
      <StatCard label="ตอนที่อนุมัติ" value={`${approvedChapters.toLocaleString("th-TH")} / ${totalChapters.toLocaleString("th-TH")}`} icon={<Bot className="h-5 w-5" />} />
      <StatCard label="ค่าใช้จ่าย AI ที่บันทึก" value={`$${totalCost.toFixed(4)}`} icon={<WalletCards className="h-5 w-5" />} />
    </div>

    <Panel
      title="Translation Master"
      description="Master แบบมีเวอร์ชันสำหรับ map แนวหลัก + overlay + scene + style ก่อนสร้าง Profile รายเรื่อง"
      action={<Link href="/admin/translation/masters" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">ตรวจและอนุมัติ Master<ArrowRight className="h-4 w-4" /></Link>}
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {Object.entries(data.masterData.counts).map(([dataset, count]) => (
            <div key={dataset} className="rounded-[12px] border border-border bg-muted/35 p-3">
              <p className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground">{dataset.replaceAll("_", " ")}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{count.active}<span className="text-xs font-normal text-muted-foreground"> / {count.total} active</span></p>
            </div>
          ))}
        </div>
        <div className={`flex max-w-sm items-start gap-3 rounded-[12px] border p-4 ${data.masterData.runtimeReady ? "border-emerald-500/25 bg-emerald-500/8" : "border-amber-500/25 bg-amber-500/8"}`}>
          <Database className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">{data.masterData.runtimeReady ? "Master พร้อมใช้สร้าง Profile" : "นำเข้าแล้ว รอ Editor อนุมัติ"}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">ทั้งหมด {data.masterData.total.toLocaleString("th-TH")} รายการ · Draft {data.masterData.draft.toLocaleString("th-TH")} · Active {data.masterData.active.toLocaleString("th-TH")}</p>
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="เตรียมงานแปลเรื่องใหม่" description="ทำทีละขั้นเพื่อให้ Profile และตอนที่ส่งแปลถูกต้องก่อนเริ่มใช้ AI">
      <div className="grid gap-6">
        <TranslationSetupSteps activeStep={1} completedThrough={0} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-stretch">
          <div className="grid gap-4">
            <div className="rounded-[14px] border border-border bg-muted/35 p-4">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"><BookOpen className="h-5 w-5" aria-hidden /></span>
                <div><h3 className="font-semibold">1. เลือกต้นฉบับ</h3><p className="text-sm text-muted-foreground">ระบบจะวิเคราะห์ชื่อ เรื่องย่อ และตัวอย่าง 3 ตอนแรก แล้วเลือก context ตามคู่ภาษาและแนวนิยายอัตโนมัติ</p></div>
              </div>
              <form onSubmit={createWorkspace} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]" aria-busy={busy}>
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
                    <p className="text-xs font-medium text-[var(--brand-emphasis)]"><Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />ข้อมูลที่จะนำไปวิเคราะห์: ชื่อเรื่อง + เรื่องย่อ + ตัวอย่างสูงสุด 3 ตอนแรก</p>
                  </div>
                ) : null}
                <Button type="submit" loading={busy} disabled={!selectedSourceId} className="md:col-span-2 md:justify-self-start"><Sparkles className="h-4 w-4" />วิเคราะห์และสร้าง Default Profile<ArrowRight className="h-4 w-4" /></Button>
              </form>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">หลังสร้าง Profile ระบบจะพาไปขั้นตรวจแก้ก่อน จากนั้นคุณจึงเลือกตอนและเริ่มแปล ระบบเลือก model และ prompt ให้อัตโนมัติจาก <code>AI_TRANSLATION_API_KEY</code></p>
          </div>
          <AiTranslationVisual active={busy} stage={profileStage?.stage} stageLabel={profileStage?.label} modelName={profileStage?.modelName} />
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
