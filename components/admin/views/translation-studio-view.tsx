"use client";

import Image from "next/image";
import Link from "next/link";
import { Activity, ArrowRight, BookOpen, CircleCheckBig, Database, Languages, LoaderCircle, Plus, Settings2, Sparkles, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { AiTranslationVisual } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
import { formatAiCost, formatTranslationDate } from "@/components/admin/translation-format";
import { TranslationSourcePicker } from "@/components/admin/translation-source-picker";
import { getTranslationSourceState } from "@/components/admin/translation-source-state";
import { translationNextAction, translationStatusLabel, translationStatusTone } from "@/components/admin/translation-status";
import { TranslationSetupSteps } from "@/components/admin/translation-setup-steps";
import { TranslationEmptyState, TranslationMetric, TranslationNotice } from "@/components/admin/translation-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/form-controls";
import { Modal, useAppDialog } from "@/components/ui/modal";
import { AUTOMATIC_TRANSLATION_ROUTING } from "@/lib/domain/translation-ai-routing";
import type { getTranslationStudio } from "@/services/translation-service";

type Data = Awaited<ReturnType<typeof getTranslationStudio>>;

type ProfileStage = { stage: string; label: string; modelName: string };

const MASTER_DATA_LABELS: Record<string, string> = {
  genre_rules: "แนวเรื่อง",
  honorific_rules: "คำเรียกขาน",
  terminology_rules: "คำศัพท์กลาง",
  style_rules: "แนวสำนวน",
  safety_rules: "ข้อควรระวัง",
};

function formatElapsedTime(seconds: number) {
  if (seconds < 60) return `${seconds} วินาที`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} นาที ${remainingSeconds.toString().padStart(2, "0")} วินาที`;
}

export function TranslationStudioView({ data }: { data: Data }) {
  const router = useRouter();
  const dialogs = useAppDialog();
  const [busy, setBusy] = useState(false);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileRegenerate, setProfileRegenerate] = useState(false);
  const [profileCanResume, setProfileCanResume] = useState(false);
  const [profileStage, setProfileStage] = useState<ProfileStage | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("th");
  const selectedSource = data.sources.find((source) => source.id === selectedSourceId);
  const normalizedTargetLanguage = targetLanguage.trim().toLocaleLowerCase();
  const targetLanguageValid = /^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/.test(normalizedTargetLanguage);
  const existingWorkspace = data.workspaces.find((workspace) => workspace.importSourceId === selectedSourceId && workspace.targetLanguage.toLocaleLowerCase() === normalizedTargetLanguage);
  const profileGenerationPending = Boolean(existingWorkspace && (existingWorkspace.status === "SETUP" || (existingWorkspace.profileGenerationStage && existingWorkspace.profileGenerationStage !== "COMPLETE")));
  const selectedSourceState = selectedSource ? getTranslationSourceState(selectedSource, existingWorkspace, normalizedTargetLanguage) : null;
  const sourceLanguageMatchesTarget = Boolean(selectedSource && selectedSource.sourceLanguage.toLocaleLowerCase() === normalizedTargetLanguage);
  const sourceContextMissing = Boolean(selectedSource && selectedSource.chapterCount === 0 && !selectedSource.synopsis?.trim());
  const existingWorkspaceReady = Boolean(existingWorkspace && existingWorkspace.status !== "SETUP" && !profileGenerationPending);
  const creationBlocked = !selectedSourceId || !targetLanguageValid || (!existingWorkspaceReady
    && (sourceLanguageMatchesTarget || sourceContextMissing || !data.masterData.runtimeReady));
  const totalChapters = data.workspaces.reduce((sum, row) => sum + row.chapterCount, 0);
  const approvedChapters = data.workspaces.reduce((sum, row) => sum + row.approvedCount, 0);
  const publishedChapters = data.workspaces.reduce((sum, row) => sum + row.publishedCount, 0);
  const needsReviewChapters = data.workspaces.reduce((sum, row) => sum + row.needsReviewCount, 0);
  const activeWorkspaces = data.workspaces.filter((row) => row.activeJobCount > 0).length;
  const totalCostMicros = data.workspaces.reduce((sum, row) => sum + row.jobCostMicros, 0);

  useEffect(() => {
    if (!busy) return;
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000)), 1_000);
    return () => window.clearInterval(timer);
  }, [busy]);

  async function runProfileCreation(regenerate = false, resume = false) {
    if (busy) return;
    setError("");
    setProfileError("");
    setProfileCanResume(false);
    setProfileRegenerate(regenerate);
    setProfileDialogOpen(true);
    setElapsedSeconds(0);
    setProfileStage({ stage: "CONNECTING", label: "กำลังเตรียมข้อมูลและเชื่อมต่อ AI", modelName: "เลือกโมเดลอัตโนมัติ" });
    setBusy(true);
    try {
      // Give the browser one frame to paint the processing overlay before the long request starts.
      await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
      const response = await fetch("/api/admin/translation/workspaces", {
        method: "POST",
        headers: { accept: "application/x-ndjson", "content-type": "application/json" },
        body: JSON.stringify({ importSourceId: selectedSourceId, targetLanguage: targetLanguage.trim(), regenerate, resume }),
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
          if (event.type === "error") throw new Error(event.error?.message || "สร้างแนวทางการแปลไม่สำเร็จ");
          if (event.type === "complete") workspaceId = event.workspace?.id ?? "";
        }
        if (done) break;
      }
      if (!workspaceId) throw new Error("AI ทำงานเสร็จแต่ไม่พบงานแปลที่สร้างไว้");
      setProfileStage({ stage: "COMPLETE", label: "สร้างแนวทางสำเร็จ กำลังเปิดงานแปล", modelName: "เลือกโมเดลอัตโนมัติ" });
      router.push(`/admin/translation/${workspaceId}`);
    } catch (cause) {
      const originalMessage = cause instanceof Error ? cause.message : "สร้างงานแปลไม่สำเร็จ";
      const query = new URLSearchParams({ importSourceId: selectedSourceId, targetLanguage: targetLanguage.trim() });
      const recovery = await fetch(`/api/admin/translation/workspaces?${query.toString()}`, { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() as Promise<{ progress: { id: string; ready: boolean; stage: string | null; error: string | null; completedStages: string[] } | null }> : null)
        .catch(() => null);
      if (recovery?.progress?.ready) {
        setProfileStage({ stage: "COMPLETE", label: "พบแนวทางที่บันทึกสำเร็จแล้ว กำลังเปิดงานแปล", modelName: "เลือกโมเดลอัตโนมัติ" });
        router.push(`/admin/translation/${recovery.progress.id}`);
        return;
      }
      if (recovery?.progress) {
        const completed = recovery.progress.completedStages.length;
        setProfileCanResume(true);
        setProfileError(`${recovery.progress.error || originalMessage} · ระบบบันทึกจุดล่าสุดไว้แล้ว${completed ? ` ${completed}/4 ขั้น` : ""} กดทำต่อได้โดยไม่เริ่มขั้นที่สำเร็จแล้วใหม่`);
      } else {
        setProfileError(originalMessage);
      }
      setBusy(false);
    }
  }

  function closeProfileDialog() {
    if (busy) return;
    setProfileDialogOpen(false);
    setProfileError("");
    setProfileCanResume(false);
    setProfileStage(null);
    setElapsedSeconds(0);
  }

  function createWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSourceId || !targetLanguageValid) {
      setError("กรุณาเลือกเรื่องและภาษาที่ต้องการแปล");
      return;
    }
    if (existingWorkspaceReady && existingWorkspace) {
      router.push(`/admin/translation/${existingWorkspace.id}`);
      return;
    }
    if (sourceLanguageMatchesTarget) {
      setError("ภาษาปลายทางต้องต่างจากภาษาต้นฉบับ");
      return;
    }
    if (sourceContextMissing) {
      setError("เรื่องนี้ยังไม่มีเรื่องย่อหรือตอนต้นฉบับสำหรับสร้าง Profile");
      return;
    }
    void runProfileCreation(Boolean(profileGenerationPending && existingWorkspace?.status !== "SETUP"), profileGenerationPending);
  }

  async function regenerateExistingProfile() {
    if (!existingWorkspace || !await dialogs.confirm({
      title: "สร้างแนวทางการแปลใหม่หรือไม่?",
      description: "ตอนที่ยังไม่เผยแพร่จะถูกทำเครื่องหมายให้ตรวจหรือแปลใหม่ ส่วนคลังคำและข้อมูลตัวละครเดิมจะยังคงอยู่",
      confirmLabel: "สร้างใหม่",
    })) return;
    void runProfileCreation(true);
  }

  return <div className="grid gap-5">
    <Modal
      open={profileDialogOpen}
      onClose={closeProfileDialog}
      dismissible={!busy}
      size="lg"
      title={profileError ? "สร้างแนวทางการแปลไม่สำเร็จ" : `กำลังวิเคราะห์ “${selectedSource?.title ?? "ต้นฉบับ"}”`}
      description={profileError ? "งานถูกหยุดไว้ที่จุดล่าสุด คุณสามารถทำต่อโดยไม่เริ่มขั้นที่สำเร็จแล้วใหม่" : "ระบบกำลังวิเคราะห์เนื้อหาและสร้างแนวทางการแปล กรุณาเปิดหน้านี้ไว้จนงานเสร็จ"}
      footer={profileError ? <>
        <Button type="button" variant="outline" onClick={closeProfileDialog}>ปิดหน้าต่าง</Button>
        <Button type="button" onClick={() => void runProfileCreation(profileRegenerate, profileCanResume)}>{profileCanResume ? "ทำต่อจากจุดล่าสุด" : "ลองสร้างใหม่"}</Button>
      </> : undefined}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-border bg-muted/35 px-3 py-2.5">
        <div className="min-w-0"><p className="truncate text-xs font-semibold">{selectedSource?.sourceLanguage.toUpperCase() ?? "—"} → {normalizedTargetLanguage.toUpperCase()} · {selectedSource?.chapterCount.toLocaleString("th-TH") ?? "0"} ตอน</p><p className="mt-0.5 text-[11px] text-muted-foreground">{profileCanResume || profileGenerationPending ? "ทำต่อจาก Checkpoint ล่าสุด" : profileRegenerate ? "สร้าง Profile รุ่นใหม่" : "สร้าง Profile ครั้งแรก"}</p></div>
        <span className="flex items-center gap-2 rounded-full bg-[var(--brand-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-emphasis)]">{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}<span className="tabular-nums">{formatElapsedTime(elapsedSeconds)}</span></span>
      </div>
      <AiTranslationVisual active={busy} failed={Boolean(profileError)} stage={profileStage?.stage} stageLabel={profileStage?.label} modelName={profileStage?.modelName} />
      {profileError ? <div role="alert" className="mt-4 rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"><p className="font-semibold">หยุดที่ขั้นตอน: {profileStage?.label ?? "กำลังเชื่อมต่อระบบ"}</p><p className="mt-1 break-words text-xs leading-relaxed">{profileError}</p></div> : <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-muted/55 px-3 py-2 text-xs text-muted-foreground"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>ระบบบันทึกความคืบหน้าแต่ละขั้น และสามารถทำต่อได้หากการเชื่อมต่อหยุดลง</div>}
    </Modal>
    {error ? <TranslationNotice role="alert" tone="danger" title="ดำเนินการไม่สำเร็จ" description={error} /> : null}
    {!data.masterData.runtimeReady ? <TranslationNotice
      role="alert"
      tone="warning"
      title="ยังเริ่มงานใหม่ไม่ได้"
      description="กฎกลางยังไม่ผ่านการอนุมัติ งานเดิมยังเปิดดูและแก้ไขได้ แต่ต้องอนุมัติกฎก่อนสร้าง AI Profile ใหม่"
      action={<ButtonLink href="/admin/translation/masters" variant="outline" size="sm">ตรวจและอนุมัติกฎ</ButtonLink>}
    /> : !data.sources.length ? <TranslationNotice
      tone="warning"
      title="ยังไม่มีต้นฉบับพร้อมแปล"
      description="นำเข้านิยายและรอให้สถานะต้นฉบับเป็นพร้อมใช้งาน แล้วกลับมาเริ่มงานแปลที่หน้านี้"
      action={<ButtonLink href="/admin/imports" variant="outline" size="sm">ไปหน้าต้นฉบับ</ButtonLink>}
    /> : <TranslationNotice
      tone="info"
      title="พื้นที่ทดลองพร้อมใช้งาน"
      description="เริ่มจากไม่กี่ตอนได้ งานแปลทำต่อเบื้องหลังและกลับมาตรวจภายหลังได้ ระบบจะไม่เผยแพร่ให้ผู้อ่านจนกว่าผู้มีสิทธิ์จะยืนยัน"
      action={<ButtonLink href="#new-translation" size="sm"><Sparkles className="h-4 w-4" />เริ่มทดลอง</ButtonLink>}
    />}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <TranslationMetric label="งานแปลทั้งหมด" value={data.workspaces.length.toLocaleString("th-TH")} hint={activeWorkspaces ? `${activeWorkspaces.toLocaleString("th-TH")} งานกำลังทำงาน` : "ไม่มีงานค้างในคิว"} icon={Languages} tone="brand" />
      <TranslationMetric label="ความคืบหน้ารวม" value={`${publishedChapters.toLocaleString("th-TH")} / ${totalChapters.toLocaleString("th-TH")}`} hint={`เผยแพร่แล้ว · ตรวจผ่าน ${approvedChapters.toLocaleString("th-TH")} ตอน`} icon={CircleCheckBig} tone="success" />
      <TranslationMetric label="รอตรวจจากคน" value={needsReviewChapters.toLocaleString("th-TH")} hint={needsReviewChapters ? "ควรตรวจคุณภาพก่อนเริ่มงานชุดใหญ่" : "ยังไม่มีตอนที่ต้องจัดการ"} icon={Activity} tone={needsReviewChapters ? "warning" : "neutral"} />
      <TranslationMetric label="ต้นทุน AI โดยประมาณ" value={formatAiCost(totalCostMicros, "$0.00")} hint={totalCostMicros ? "คำนวณจาก token · รวมทุกงาน" : "จะแสดงหลังมีการเรียก AI"} icon={WalletCards} tone="neutral" />
    </div>

    <Panel
      title="งานแปลของคุณ"
      description="เปิดงานล่าสุดและทำขั้นตอนที่ระบบแนะนำต่อได้ทันที"
      action={<ButtonLink href="#new-translation" size="sm"><Plus className="h-4 w-4" />สร้างงานใหม่</ButtonLink>}
      bodyClassName="p-0"
    >
      <div className="grid gap-3 p-4 md:hidden">
        {data.workspaces.map((row) => {
          const progress = row.chapterCount > 0 ? Math.round((row.publishedCount / row.chapterCount) * 100) : 0;
          return <Link key={row.id} href={`/admin/translation/${row.id}`} className="rounded-[14px] border border-border bg-card p-4 transition-[background-color,border-color,box-shadow] hover:border-[var(--brand-primary)]/35 hover:bg-muted/35 hover:shadow-[var(--sh-1)]"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-semibold">{row.title}</p><p className="mt-1 text-xs text-muted-foreground">{row.sourceLanguage.toUpperCase()} → {row.targetLanguage.toUpperCase()} · อัปเดต {formatTranslationDate(row.updatedAt)}</p></div><StatusPill label={row.activeJobCount ? "AI กำลังทำงาน" : translationStatusLabel(row.status)} tone={row.activeJobCount ? "info" : translationStatusTone(row.status)} /></div><div className="mt-4 flex items-center justify-between text-xs"><span className="text-muted-foreground">เผยแพร่ {row.publishedCount.toLocaleString("th-TH")} / {row.chapterCount.toLocaleString("th-TH")} ตอน</span><strong className="tabular-nums">{progress}%</strong></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} /></div><div className="mt-4 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-[var(--brand-light-on-light)]">{translationNextAction(row.status, row.publishReadyCount, row.needsReviewCount, row.chapterCount)} <ArrowRight className="inline h-4 w-4" /></p><span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{formatAiCost(row.jobCostMicros, "$0.00")}</span></div></Link>;
        })}
        {!data.workspaces.length ? <TranslationEmptyState title="เริ่มงานแปลแรกของคุณ" description="เลือกต้นฉบับและภาษาปลายทาง ระบบจะช่วยสร้างแนวทาง คลังคำ และพาไปทดลองแปลตอนแรก" action={<ButtonLink href="#new-translation"><Sparkles className="h-4 w-4" />เริ่มตั้งค่างานแปล</ButtonLink>} /> : null}
      </div>
      <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">เรื่อง</th><th className="px-4 py-3">ภาษา</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ความคืบหน้า</th><th className="px-4 py-3">ต้นทุน</th><th className="px-4 py-3">อัปเดตล่าสุด</th><th className="px-4 py-3">ขั้นตอนถัดไป</th><th className="px-4 py-3" /></tr></thead><tbody>
        {data.workspaces.map((row) => { const progress = row.chapterCount > 0 ? Math.round((row.publishedCount / row.chapterCount) * 100) : 0; return <tr key={row.id} className="border-b border-border/70 transition-colors last:border-0 hover:bg-muted/30"><td className="max-w-64 px-4 py-3 font-semibold"><Link className="block truncate hover:underline" href={`/admin/translation/${row.id}`}>{row.title}</Link><span className="mt-0.5 block truncate text-xs font-normal text-muted-foreground">{row.sourceTitle}</span></td><td className="whitespace-nowrap px-4 py-3 uppercase">{row.sourceLanguage} → {row.targetLanguage}</td><td className="px-4 py-3"><StatusPill label={row.activeJobCount ? "AI กำลังทำงาน" : translationStatusLabel(row.status)} tone={row.activeJobCount ? "info" : translationStatusTone(row.status)} /></td><td className="w-36 px-4 py-3"><div className="flex justify-between gap-2 text-xs"><span>{row.publishedCount} / {row.chapterCount}</span><strong className="tabular-nums">{progress}%</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} /></div></td><td className="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">{formatAiCost(row.jobCostMicros, "$0.00")}</td><td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatTranslationDate(row.updatedAt)}</td><td className="max-w-56 px-4 py-3 text-muted-foreground">{translationNextAction(row.status, row.publishReadyCount, row.needsReviewCount, row.chapterCount)}</td><td className="px-4 py-3 text-right"><Link className="whitespace-nowrap font-semibold text-[var(--brand-light-on-light)] hover:underline" href={`/admin/translation/${row.id}`}>เปิดงาน <ArrowRight className="inline h-4 w-4" /></Link></td></tr>; })}
        {!data.workspaces.length ? <tr><td colSpan={8}><TranslationEmptyState title="ยังไม่มีงานแปล" description="สร้างงานแรกจากต้นฉบับที่นำเข้าไว้แล้ว ระบบจะเตรียมทุกอย่างให้ก่อนเริ่มแปลจริง" action={<ButtonLink href="#new-translation">สร้างงานแปลแรก</ButtonLink>} /></td></tr> : null}
      </tbody></table></div>
    </Panel>

    <div id="new-translation" className="scroll-mt-24"><Panel title="สร้างงานแปลใหม่" description="เลือกต้นฉบับครั้งเดียว ระบบจะสร้างแนวทางการแปลและพาไปเลือกตอนต่อทันที">
      <div className="grid gap-6">
        <TranslationSetupSteps activeStep={1} completedThrough={0} />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_390px] xl:items-stretch">
          <div className="grid gap-4">
            <div className="rounded-[14px] border border-border bg-muted/35 p-4">
              <div className="mb-4 flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-primary)]/10 text-[var(--brand-emphasis)]"><BookOpen className="h-5 w-5" aria-hidden /></span>
                <div><h3 className="font-semibold">1. เลือกต้นฉบับ</h3><p className="text-sm text-muted-foreground">ระบบจะวิเคราะห์ชื่อ เรื่องย่อ และตัวอย่าง 3 ตอนแรก แล้วเลือกแนวทางที่เหมาะกับภาษาและแนวนิยายให้อัตโนมัติ</p></div>
              </div>
              <form onSubmit={createWorkspace} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_150px]" aria-busy={busy}>
                <Field label="เรื่องที่นำเข้า">
                  <TranslationSourcePicker
                    sources={data.sources}
                    workspaces={data.workspaces}
                    targetLanguage={normalizedTargetLanguage}
                    value={selectedSourceId}
                    onChange={(sourceId) => { setSelectedSourceId(sourceId); setError(""); }}
                  />
                </Field>
                <Field label="ภาษาที่ต้องการแปล">
                  <Select name="targetLanguage" value={targetLanguage} onChange={(event) => { setTargetLanguage(event.target.value); setError(""); }} required>
                    <option value="th">ภาษาไทย</option>
                    <option value="en">ภาษาอังกฤษ</option>
                    <option value="zh">ภาษาจีน</option>
                    <option value="ja">ภาษาญี่ปุ่น</option>
                  </Select>
                </Field>
                {selectedSource ? (
                  <div className="grid gap-4 rounded-[12px] border border-border bg-card p-4 md:col-span-2 sm:grid-cols-[80px_minmax(0,1fr)]">
                    <div className="relative aspect-[2/3] w-20 overflow-hidden rounded-[8px] bg-muted shadow-sm">
                      <Image src={selectedSource.coverUrl} alt={`ปก ${selectedSource.title}`} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><strong className="block truncate text-sm">{selectedSource.title}</strong><span className="mt-0.5 block text-xs text-muted-foreground">{selectedSource.provider} · {selectedSource.sourceLanguage.toUpperCase()} → {normalizedTargetLanguage.toUpperCase()}</span></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{selectedSource.chapterCount.toLocaleString("th-TH")} ตอน</span></div>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{selectedSource.synopsis?.trim() || "ต้นฉบับนี้ไม่มีเรื่องย่อ ระบบจะวิเคราะห์จากตัวอย่างตอนเพื่อสร้างแนวทางการแปล"}</p>
                      <p className="mt-2 text-xs font-medium text-[var(--brand-emphasis)]"><Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />ข้อมูลวิเคราะห์: ชื่อเรื่อง + เรื่องย่อ + ตัวอย่างสูงสุด 3 ตอนแรก{selectedSource.chapterCount === 0 && selectedSource.synopsis?.trim() ? " · เรื่องนี้จะใช้เรื่องย่อเท่านั้น" : ""}</p>
                      {selectedSourceState ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-border bg-muted/35 p-3">
                          <div className="min-w-0"><p className="text-sm font-semibold">สถานะงานภาษา {normalizedTargetLanguage.toUpperCase()}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{selectedSourceState.detail}</p></div>
                          <StatusPill label={selectedSourceState.label} tone={selectedSourceState.tone} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {existingWorkspace?.profileGenerationError ? (
                  <div className="md:col-span-2"><TranslationNotice tone="danger" role="alert" title="Profile ครั้งก่อนหยุดก่อนเสร็จ" description={<><span className="break-words">{existingWorkspace.profileGenerationError}</span><br />Checkpoint ที่สำเร็จแล้วถูกเก็บไว้ ปุ่มด้านล่างจะทำต่อจากจุดล่าสุด</>} /></div>
                ) : null}
                <div className="grid gap-2 rounded-[12px] border border-border bg-card p-3 text-xs text-muted-foreground md:col-span-2 sm:grid-cols-3">
                  <p><strong className="block text-foreground">ยังไม่เริ่มแปลตอน</strong>ขั้นนี้สร้างเฉพาะแนวทางและข้อมูลตั้งต้น</p>
                  <p><strong className="block text-foreground">ใช้เวลาได้ถึง 15 นาที</strong>เปิดหน้านี้ไว้ระหว่างสร้างแนวทางครั้งแรก</p>
                  <p><strong className="block text-foreground">กลับมาทำต่อได้</strong>ระบบบันทึกแต่ละขั้นหากการเชื่อมต่อสะดุด</p>
                </div>
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button
                    type="submit"
                    loading={busy}
                    disabled={creationBlocked}
                    title={existingWorkspaceReady ? undefined : !selectedSourceId ? "เลือกต้นฉบับก่อน" : !targetLanguageValid ? "รูปแบบภาษาปลายทางไม่ถูกต้อง" : sourceLanguageMatchesTarget ? "เลือกภาษาที่ต่างจากต้นฉบับ" : sourceContextMissing ? "เพิ่มเรื่องย่อหรือตอนต้นฉบับก่อน" : !data.masterData.runtimeReady ? "อนุมัติกฎกลางก่อนสร้างแนวทางการแปล" : undefined}
                  >
                    {existingWorkspaceReady ? <><BookOpen className="h-4 w-4" />{existingWorkspace?.activeJobCount ? "เปิดงานที่ AI กำลังทำ" : "เปิดงานแปลเดิม"}<ArrowRight className="h-4 w-4" /></> : <><Sparkles className="h-4 w-4" />{profileGenerationPending ? "ทำต่อจากจุดล่าสุด" : existingWorkspace ? "เตรียมแนวทางต่อให้เสร็จ" : "สร้างแนวทางการแปล"}<ArrowRight className="h-4 w-4" /></>}
                  </Button>
                  {existingWorkspaceReady ? (
                    <Button type="button" variant="outline" loading={busy} disabled={!data.masterData.runtimeReady || Boolean(existingWorkspace?.activeJobCount) || sourceContextMissing} title={existingWorkspace?.activeJobCount ? "รอให้งาน AI ปัจจุบันเสร็จก่อนสร้าง Profile ใหม่" : sourceContextMissing ? "เพิ่มเรื่องย่อหรือตอนต้นฉบับก่อนสร้าง Profile ใหม่" : !data.masterData.runtimeReady ? "อนุมัติกฎกลางก่อนสร้างแนวทางใหม่" : undefined} onClick={() => void regenerateExistingProfile()}>
                      <Sparkles className="h-4 w-4" />สร้างแนวทางใหม่
                    </Button>
                  ) : null}
                </div>
                {!selectedSourceId ? <p className="text-xs text-muted-foreground md:col-span-2">ค้นหาหรือกรองสถานะ แล้วเลือกต้นฉบับเพื่อดูสิ่งที่ระบบจะทำต่อ</p> : !targetLanguageValid ? <p role="alert" className="text-xs text-destructive md:col-span-2">รูปแบบภาษาปลายทางไม่ถูกต้อง</p> : !existingWorkspaceReady && sourceLanguageMatchesTarget ? <p role="alert" className="text-xs text-amber-700 md:col-span-2 dark:text-amber-300">เรื่องนี้เป็นภาษา {selectedSource?.sourceLanguage.toUpperCase()} อยู่แล้ว กรุณาเลือกภาษาปลายทางอื่น</p> : !existingWorkspaceReady && sourceContextMissing ? <p role="alert" className="text-xs text-destructive md:col-span-2">ยังสร้าง Profile ไม่ได้: เรื่องนี้ไม่มีทั้งเรื่องย่อและตอนต้นฉบับ</p> : !data.masterData.runtimeReady && !existingWorkspaceReady ? <p role="alert" className="text-xs text-amber-700 md:col-span-2 dark:text-amber-300">ต้องอนุมัติกฎกลางก่อนสร้างแนวทางใหม่</p> : existingWorkspaceReady && sourceContextMissing ? <p role="status" className="text-xs text-amber-700 md:col-span-2 dark:text-amber-300">เปิดงานเดิมได้ตามปกติ แต่ต้องเพิ่มเรื่องย่อหรือตอนต้นฉบับก่อนสร้าง Profile ใหม่</p> : error ? <p role="alert" className="text-xs text-destructive md:col-span-2">{error}</p> : null}
              </form>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">เมื่อเสร็จระบบจะพาไปเลือกตอนแปลทันที คุณสามารถกลับมาแก้สำนวน คลังคำ หรือตัวละครได้ภายหลัง</p>
          </div>
          <AiTranslationVisual active={busy} stage={profileStage?.stage} stageLabel={profileStage?.label} modelName={profileStage?.modelName} />
        </div>
      </div>
    </Panel></div>

    <details className="group rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold"><span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" />การตั้งค่าขั้นสูงของ AI</span><span className="text-xs font-normal text-muted-foreground">กฎกลาง รุ่นโมเดล และเส้นทางการทำงาน</span></summary>
      <div className="grid gap-5 border-t border-border p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(data.masterData.counts).map(([dataset, count]) => <div key={dataset} className="rounded-[12px] border border-border bg-muted/35 p-3"><p className="truncate text-[11px] font-semibold tracking-wide text-muted-foreground">{MASTER_DATA_LABELS[dataset] ?? dataset.replaceAll("_", " ")}</p><p className="mt-1 text-lg font-bold tabular-nums">{count.active}<span className="text-xs font-normal text-muted-foreground"> / {count.total} ใช้งาน</span></p></div>)}</div>
          <div className={`flex max-w-sm items-start gap-3 rounded-[12px] border p-4 ${data.masterData.runtimeReady ? "border-emerald-500/25 bg-emerald-500/8" : "border-amber-500/25 bg-amber-500/8"}`}><Database className="mt-0.5 h-5 w-5 shrink-0" aria-hidden /><div><p className="font-semibold">{data.masterData.runtimeReady ? "กฎกลางพร้อมใช้งาน" : "รอผู้แก้ไขอนุมัติกฎกลาง"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">ทั้งหมด {data.masterData.total.toLocaleString("th-TH")} รายการ · รอตรวจ {data.masterData.draft.toLocaleString("th-TH")} · ใช้งาน {data.masterData.active.toLocaleString("th-TH")}</p></div></div>
        </div>
        <Link href="/admin/translation/masters" className="inline-flex items-center gap-1 justify-self-start text-sm font-semibold text-[var(--brand-light-on-light)] hover:underline">จัดการกฎกลาง<ArrowRight className="h-4 w-4" /></Link>
        <div className="overflow-x-auto rounded-[12px] border border-border"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">ประเภทงาน</th><th className="px-4 py-3">โมเดล</th><th className="px-4 py-3">เหตุผลที่เลือก</th></tr></thead><tbody>{AUTOMATIC_TRANSLATION_ROUTING.map((route) => <tr key={route.task} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 font-medium">{route.label}</td><td className="px-4 py-3">{route.modelLabel}</td><td className="px-4 py-3 text-muted-foreground">{route.reason}</td></tr>)}</tbody></table></div>
      </div>
    </details>
  </div>;
}
