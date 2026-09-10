"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Bot, Check, Database, Languages, LoaderCircle, Search, Sparkles, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useId, useMemo, useState } from "react";

import { Panel, StatCard } from "@/components/admin/admin-ui";
import { AiTranslationVisual } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
import { TranslationSetupSteps } from "@/components/admin/translation-setup-steps";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { AUTOMATIC_TRANSLATION_ROUTING } from "@/lib/domain/translation-ai-routing";
import type { getTranslationStudio } from "@/services/translation-service";

type Data = Awaited<ReturnType<typeof getTranslationStudio>>;

type ProfileStage = { stage: string; label: string; modelName: string };
type Source = Data["sources"][number];

function SourceAutocomplete({ sources, value, existingSourceIds, onChange }: {
  sources: Source[];
  value: string;
  existingSourceIds: Set<string>;
  onChange: (sourceId: string) => void;
}) {
  const listboxId = useId();
  const selected = sources.find((source) => source.id === value);
  const [query, setQuery] = useState(selected?.title ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return sources.slice(0, 30);
    return sources.filter((source) => `${source.title} ${source.provider} ${source.sourceLanguage}`.toLocaleLowerCase().includes(term)).slice(0, 30);
  }, [query, sources]);

  function choose(source: Source) {
    onChange(source.id);
    setQuery(source.title);
    setOpen(false);
    setActive(0);
  }

  return <div
    className="relative"
    onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setOpen(false);
        setQuery(selected?.title ?? "");
      }
    }}
  >
    <input type="hidden" name="importSourceId" value={value} />
    <Search className="pointer-events-none absolute left-3 top-3.5 z-10 h-4 w-4 text-muted-foreground" aria-hidden />
    <Input
      type="search"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={listboxId}
      aria-activedescendant={open && results[active] ? `${listboxId}-${results[active].id}` : undefined}
      autoComplete="off"
      value={query}
      placeholder="พิมพ์ชื่อเรื่องเพื่อค้นหา"
      className="pl-9"
      onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
      onChange={(event) => { setQuery(event.target.value); onChange(""); setOpen(true); setActive(0); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, Math.max(0, results.length - 1))); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
        else if (event.key === "Enter" && open && results[active]) { event.preventDefault(); choose(results[active]); }
        else if (event.key === "Escape") { setOpen(false); setQuery(selected?.title ?? ""); }
      }}
    />
    {open ? <div id={listboxId} role="listbox" aria-label="ผลการค้นหาเรื่อง" className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-[min(60vh,440px)] overflow-y-auto rounded-[12px] border border-border bg-popover p-1.5 shadow-[var(--sh-2)]">
      {results.map((source, index) => <button
        id={`${listboxId}-${source.id}`}
        key={source.id}
        type="button"
        role="option"
        aria-selected={source.id === value}
        className={`flex w-full items-center gap-3 rounded-[9px] p-2 text-left transition-colors hover:bg-muted ${index === active ? "bg-muted" : ""}`}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(source)}
      >
        <span className="relative aspect-[2/3] w-11 shrink-0 overflow-hidden rounded-[6px] bg-muted"><Image src={source.coverUrl} alt="" fill sizes="44px" className="object-cover" /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{source.title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{source.provider} · {source.sourceLanguage} · {source.chapterCount.toLocaleString("th-TH")} ตอน</span></span>
        {existingSourceIds.has(source.id) ? <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"><Check className="h-3 w-3" />มี Profile</span> : null}
      </button>)}
      {!results.length ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">ไม่พบเรื่องที่ค้นหา</p> : null}
    </div> : null}
  </div>;
}

export function TranslationStudioView({ data }: { data: Data }) {
  const router = useRouter();
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
  const profileGenerationPending = Boolean(existingWorkspace?.profileGenerationStage && existingWorkspace.profileGenerationStage !== "COMPLETE");
  const existingSourceIds = useMemo(() => new Set(data.workspaces.filter((workspace) => workspace.status !== "SETUP" && workspace.targetLanguage.toLocaleLowerCase() === normalizedTargetLanguage).map((workspace) => workspace.importSourceId)), [data.workspaces, normalizedTargetLanguage]);
  const totalChapters = data.workspaces.reduce((sum, row) => sum + row.chapterCount, 0);
  const approvedChapters = data.workspaces.reduce((sum, row) => sum + row.approvedCount, 0);
  const totalCost = data.workspaces.reduce((sum, row) => sum + row.jobCostMicros, 0) / 1_000_000;

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
    setProfileStage({ stage: "CONNECTING", label: "กำลังเตรียมข้อมูลและเชื่อมต่อ AI", modelName: "Automatic routing" });
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
          if (event.type === "error") throw new Error(event.error?.message || "สร้าง AI Profile ไม่สำเร็จ");
          if (event.type === "complete") workspaceId = event.workspace?.id ?? "";
        }
        if (done) break;
      }
      if (!workspaceId) throw new Error("AI ทำงานเสร็จแต่ไม่ได้คืน Workspace");
      setProfileStage({ stage: "COMPLETE", label: "สร้าง AI Profile สำเร็จ กำลังเปิด Workspace", modelName: "Automatic routing" });
      router.push(`/admin/translation/${workspaceId}`);
    } catch (cause) {
      const originalMessage = cause instanceof Error ? cause.message : "สร้าง Workspace ไม่สำเร็จ";
      const query = new URLSearchParams({ importSourceId: selectedSourceId, targetLanguage: targetLanguage.trim() });
      const recovery = await fetch(`/api/admin/translation/workspaces?${query.toString()}`, { cache: "no-store" })
        .then(async (response) => response.ok ? response.json() as Promise<{ progress: { id: string; ready: boolean; stage: string | null; error: string | null; completedStages: string[] } | null }> : null)
        .catch(() => null);
      if (recovery?.progress?.ready) {
        setProfileStage({ stage: "COMPLETE", label: "พบ Profile ที่บันทึกสำเร็จแล้ว กำลังเปิด Workspace", modelName: "Automatic routing" });
        router.push(`/admin/translation/${recovery.progress.id}`);
        return;
      }
      if (recovery?.progress) {
        const completed = recovery.progress.completedStages.length;
        setProfileCanResume(true);
        setProfileError(`${recovery.progress.error || originalMessage} · Workspace และ checkpoint ถูกบันทึกไว้แล้ว${completed ? ` ${completed}/4 ขั้น` : ""} กดทำต่อได้โดยไม่เริ่มขั้นที่สำเร็จแล้วใหม่`);
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
      setError("กรุณาเลือกเรื่องและระบุรหัสภาษาปลายทางให้ถูกต้อง เช่น th หรือ en-us");
      return;
    }
    if (existingWorkspace && existingWorkspace.status !== "SETUP" && !profileGenerationPending) {
      router.push(`/admin/translation/${existingWorkspace.id}`);
      return;
    }
    void runProfileCreation(Boolean(profileGenerationPending && existingWorkspace?.status !== "SETUP"), profileGenerationPending);
  }

  function regenerateExistingProfile() {
    if (!existingWorkspace || !window.confirm("สร้าง Profile ใหม่จาก Master ล่าสุด? ตอนแปลที่ยังไม่เผยแพร่จะถูกทำเครื่องหมายให้ตรวจหรือแปลใหม่ แต่ Glossary และตัวละครเดิมจะยังอยู่")) return;
    void runProfileCreation(true);
  }

  return <div className="grid gap-5">
    {profileDialogOpen ? (
      <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ai-profile-progress-title">
        <div className="w-full max-w-2xl rounded-[22px] border border-[var(--brand-primary)]/30 bg-card p-5 shadow-2xl sm:p-7">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--brand-emphasis)]">AI Profile Pipeline</p>
              <h2 id="ai-profile-progress-title" className="mt-1 text-xl font-bold">{profileError ? "สร้าง Profile ไม่สำเร็จ" : `กำลังวิเคราะห์ “${selectedSource?.title ?? "ต้นฉบับ"}”`}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{profileError ? "ระบบหยุดงานไว้โดยไม่บันทึก Profile จำลอง คุณสามารถดูสาเหตุและลองใหม่ได้จากหน้าต่างนี้" : "กรุณาเปิดหน้านี้ไว้จนสร้าง Profile เสร็จ ระบบจะแสดงขั้นตอนจากเซิร์ฟเวอร์แบบสด"}</p>
            </div>
            <span className="flex shrink-0 items-center gap-2 rounded-full bg-[var(--brand-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-emphasis)]">{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}{elapsedSeconds}s</span>
          </div>
          <AiTranslationVisual active={busy} failed={Boolean(profileError)} stage={profileStage?.stage} stageLabel={profileStage?.label} modelName={profileStage?.modelName} />
          {profileError ? (
            <>
              <div role="alert" className="mt-4 rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <p className="font-semibold">AI หยุดที่ขั้นตอน: {profileStage?.label ?? "กำลังเชื่อมต่อระบบ"}</p>
                <p className="mt-1 break-words text-xs leading-relaxed">{profileError}</p>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeProfileDialog}>ปิดหน้าต่าง</Button>
                <Button type="button" onClick={() => void runProfileCreation(profileRegenerate, profileCanResume)}>{profileCanResume ? "ทำต่อจาก Checkpoint" : "ลองสร้าง Profile ใหม่"}</Button>
              </div>
            </>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-[12px] bg-muted/55 px-3 py-2 text-xs text-muted-foreground">
              <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" /></span>
              Request กำลังทำงานจริง · ระบบจะไม่สร้าง Profile จำลองเมื่อ AI ล้มเหลว
            </div>
          )}
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

    <Panel title="เตรียมงานแปลเรื่องใหม่" description="เลือกต้นฉบับครั้งเดียว ระบบจะวิเคราะห์ เลือก Master สร้างและตรวจ Profile จนพร้อมเลือกตอนแปล">
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
                  <SourceAutocomplete
                    sources={data.sources}
                    value={selectedSourceId}
                    existingSourceIds={existingSourceIds}
                    onChange={setSelectedSourceId}
                  />
                </Field>
                <Field label="ภาษาปลายทาง" hint="รหัสภาษา เช่น th">
                  <Input name="targetLanguage" value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)} required placeholder="th" />
                </Field>
                {selectedSource ? (
                  <div className="grid gap-4 rounded-[12px] border border-border bg-card p-4 md:col-span-2 sm:grid-cols-[80px_minmax(0,1fr)]">
                    <div className="relative aspect-[2/3] w-20 overflow-hidden rounded-[8px] bg-muted shadow-sm">
                      <Image src={selectedSource.coverUrl} alt={`ปก ${selectedSource.title}`} fill sizes="80px" className="object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2"><strong className="min-w-0 text-sm">{selectedSource.title}</strong><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{selectedSource.chapterCount.toLocaleString("th-TH")} ตอน</span></div>
                      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{selectedSource.synopsis?.trim() || "ต้นฉบับนี้ไม่มีเรื่องย่อ ระบบจะวิเคราะห์จากตัวอย่างตอนเพื่อสร้าง Profile พร้อมใช้"}</p>
                      <p className="mt-2 text-xs font-medium text-[var(--brand-emphasis)]"><Sparkles className="mr-1 inline h-3.5 w-3.5" aria-hidden />ข้อมูลวิเคราะห์: ชื่อเรื่อง + เรื่องย่อ + ตัวอย่างสูงสุด 3 ตอนแรก</p>
                      {existingWorkspace ? (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-emerald-500/20 bg-emerald-500/5 p-3">
                          <div><p className="text-sm font-semibold">{profileGenerationPending || existingWorkspace.status === "SETUP" ? `มี Workspace ภาษา ${normalizedTargetLanguage} ที่ยังไม่เสร็จ` : `มี Profile ภาษา ${normalizedTargetLanguage} แล้ว`}</p><p className="mt-0.5 text-xs text-muted-foreground">{profileGenerationPending || existingWorkspace.status === "SETUP" ? "ระบบจะทำต่อจาก Checkpoint ล่าสุดโดยไม่เรียกขั้นที่สำเร็จแล้วซ้ำ" : "เปิดงานเดิมได้ทันที หรือเลือกสร้างใหม่จาก Master ล่าสุด"}</p></div>
                          <StatusPill label={existingWorkspace.status} tone={existingWorkspace.status === "COMPLETED" ? "success" : existingWorkspace.status === "TRANSLATING" ? "info" : existingWorkspace.status === "SETUP" ? "warning" : "neutral"} />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2 md:col-span-2">
                  <Button
                    type="submit"
                    loading={busy}
                    disabled={!selectedSourceId || !targetLanguageValid || ((!existingWorkspace || existingWorkspace.status === "SETUP") && !data.masterData.runtimeReady)}
                    title={!data.masterData.runtimeReady && (!existingWorkspace || existingWorkspace.status === "SETUP") ? "อนุมัติ Translation Master ก่อนสร้าง Profile พร้อมใช้" : undefined}
                  >
                    {existingWorkspace && existingWorkspace.status !== "SETUP" && !profileGenerationPending ? <><BookOpen className="h-4 w-4" />เปิด Profile เดิม<ArrowRight className="h-4 w-4" /></> : <><Sparkles className="h-4 w-4" />{profileGenerationPending ? "ทำต่อจาก Checkpoint" : existingWorkspace ? "สร้าง Profile ต่อให้เสร็จ" : "สร้าง Profile พร้อมใช้"}<ArrowRight className="h-4 w-4" /></>}
                  </Button>
                  {existingWorkspace && existingWorkspace.status !== "SETUP" && !profileGenerationPending ? (
                    <Button type="button" variant="outline" loading={busy} disabled={!data.masterData.runtimeReady} title={!data.masterData.runtimeReady ? "อนุมัติ Translation Master ก่อนสร้าง Profile ใหม่" : undefined} onClick={regenerateExistingProfile}>
                      <Sparkles className="h-4 w-4" />สร้างใหม่จาก Master ล่าสุด
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">เมื่อเสร็จระบบจะพาไปเลือกตอนแปลทันที และยังย้อนกลับมาแก้ชื่อ Profile คลังคำ หรือตัวละครได้ภายหลัง ระบบเลือก model และ prompt ให้อัตโนมัติจาก <code>AI_TRANSLATION_API_KEY</code></p>
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
