"use client";

import Link from "next/link";
import { ArrowLeft, Bot, CheckCircle2, ChevronDown, CloudUpload, ListChecks, RefreshCw, Save, Search, Settings2, Sparkles, TriangleAlert, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { AiTranslationProgress, AiTranslationVisual } from "@/components/admin/ai-translation-visual";
import { StatusPill } from "@/components/admin/status-pill";
import { translationStatusLabel, translationStatusTone } from "@/components/admin/translation-status";
import { TranslationSetupSteps } from "@/components/admin/translation-setup-steps";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { Modal, useAppDialog } from "@/components/ui/modal";
import type { getTranslationWorkspace } from "@/services/translation-service";

type Data = NonNullable<Awaited<ReturnType<typeof getTranslationWorkspace>>>;
type Glossary = Data["glossary"][number];
type Character = Data["characters"][number];
type TitleReview = NonNullable<Data["titleReview"]>;
type WizardStep = 2 | 3;
type ProfileStage = { stage: string; label: string; modelName: string };

type ChapterAction = "TRANSLATE" | "POLISH" | "PUBLISH";
type BulkPublishResult = {
  requested: number;
  published: number;
  failed: number;
  failures: Array<{ chapterId: string; chapterNumber: number; message: string }>;
};

const TRANSLATE_ELIGIBLE_STATUSES = new Set(["READY", "STALE", "DRAFT", "QA_FAILED", "REVIEW", "APPROVED", "FAILED"]);
const POLISH_ELIGIBLE_STATUSES = new Set(["DRAFT", "QA_FAILED", "REVIEW", "APPROVED", "PUBLISHED", "FAILED"]);
const PROGRESS_STAGE_LABELS: Record<string, string> = {
  QUEUED: "รอคิว",
  CONTEXT: "เตรียมบริบท",
  CANON_ANALYSIS: "AI กำลังวิเคราะห์ข้อมูลสำคัญของเรื่อง",
  AI_REQUEST: "AI กำลังแปลและจดจำข้อมูลสำคัญ",
  AI_QA: "AI กำลังตรวจเทียบต้นฉบับ",
  ESCALATION: "AI กำลังแก้เฉพาะจุดที่ตรวจพบ",
  CODE_QA: "ระบบกำลังตรวจคำศัพท์และโครงสร้าง",
  SAVING: "กำลังบันทึกและเตรียมเผยแพร่",
  DONE: "ตรวจผ่าน · พร้อมเผยแพร่",
  FAILED: "แปลไม่สำเร็จ",
  CANCELLED: "ยกเลิกแล้ว",
};

async function mutate(url: string, method: "POST" | "PATCH", body?: unknown) {
  const response = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || `HTTP ${response.status}`);
  return payload;
}

export function TranslationWorkspaceView({ data, canCancelJobs }: { data: Data; canCancelJobs: boolean }) {
  const router = useRouter();
  const dialogs = useAppDialog();
  const needsProfileReview = data.workspace.status === "SETUP" || !data.profile;
  const [step, setStep] = useState<WizardStep>(needsProfileReview ? 2 : 3);
  const [profileConfirmed, setProfileConfirmed] = useState(!needsProfileReview);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [glossary, setGlossary] = useState<Glossary[]>(data.glossary);
  const [characters, setCharacters] = useState<Character[]>(data.characters);
  const [translatedTitle, setTranslatedTitle] = useState(data.translatedMetadata?.title ?? "");
  const [translatedSynopsis, setTranslatedSynopsis] = useState(data.translatedMetadata?.synopsis ?? "");
  const [titleReview, setTitleReview] = useState<TitleReview | null>(data.titleReview);
  const [profileStage, setProfileStage] = useState<ProfileStage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [chapterAction, setChapterAction] = useState<ChapterAction>("TRANSLATE");
  const [chapterQuery, setChapterQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const activeJobs = data.jobs.some((job) => job.status === "QUEUED" || job.status === "RUNNING");
  const activeJob = data.jobs.find((job) => job.status === "RUNNING") ?? data.jobs.find((job) => job.status === "QUEUED");
  const currentChapter = data.chapters.find((chapter) => chapter.jobItemStatus === "RUNNING")
    ?? data.chapters.find((chapter) => chapter.jobItemStatus === "QUEUED");
  const { publishedCount, publishReadyCount, needsReviewCount } = useMemo(() => data.chapters.reduce((summary, chapter) => {
    if (chapter.status === "PUBLISHED") summary.publishedCount += 1;
    if (chapter.status === "APPROVED" && chapter.publishReady && chapter.criticalIssues === 0) summary.publishReadyCount += 1;
    if (chapter.status === "REVIEW" || chapter.status === "QA_FAILED") summary.needsReviewCount += 1;
    return summary;
  }, { publishedCount: 0, publishReadyCount: 0, needsReviewCount: 0 }), [data.chapters]);

  useEffect(() => {
    if (!activeJobs) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [activeJobs, router]);

  const eligibleChapters = useMemo(
    () => data.chapters.filter((chapter) => chapterAction === "PUBLISH"
      ? chapter.status === "APPROVED" && chapter.publishReady && chapter.criticalIssues === 0
      : (chapterAction === "POLISH" ? POLISH_ELIGIBLE_STATUSES : TRANSLATE_ELIGIBLE_STATUSES).has(chapter.status)
        && (chapterAction !== "POLISH" || chapter.revision > 0)),
    [chapterAction, data.chapters],
  );
  const visibleChapters = useMemo(() => {
    const query = chapterQuery.trim().toLocaleLowerCase();
    return data.chapters.filter((chapter) => {
      if (statusFilter !== "ALL" && chapter.status !== statusFilter) return false;
      if (!query) return true;
      return String(chapter.chapterNumber).includes(query) || (chapter.sourceTitle ?? "").toLocaleLowerCase().includes(query);
    });
  }, [chapterQuery, data.chapters, statusFilter]);
  const eligibleChapterIds = new Set(eligibleChapters.map((chapter) => chapter.id));
  const visibleEligible = visibleChapters.filter((chapter) => eligibleChapterIds.has(chapter.id));
  const allVisibleSelected = visibleEligible.length > 0 && visibleEligible.slice(0, 100).every((chapter) => selected.has(chapter.id));

  async function perform(key: string, work: () => Promise<unknown>, success: string) {
    setBusy(key); setError(""); setMessage("");
    try {
      await work();
      setMessage(success);
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ดำเนินการไม่สำเร็จ");
      return false;
    } finally {
      setBusy("");
    }
  }

  async function saveConfiguration(formData: FormData) {
    const saved = await perform("save", () => mutate(`/api/admin/translation/workspaces/${data.workspace.id}`, "PATCH", {
      expectedVersion: data.workspace.version,
      metadata: { title: translatedTitle, synopsis: translatedSynopsis.trim() || null },
      profile: {
        name: formData.get("profileName"), styleGuide: formData.get("styleGuide"), instructions: formData.get("instructions"), preserveParagraphs: formData.get("preserveParagraphs") === "on",
      },
      glossary: glossary.filter((entry) => entry.sourceTerm.trim() && entry.targetTerm.trim()).map(({ sourceTerm, targetTerm, note, isLocked }) => ({ sourceTerm, targetTerm, note, isLocked })),
      characters: characters.filter((character) => character.sourceName.trim() && character.targetName.trim()).map(({ sourceName, targetName, aliases, description, speakingStyle, isLocked }) => ({ sourceName, targetName, aliases, description, speakingStyle, isLocked })),
    }), "บันทึกแนวทางการแปลแล้ว เลือกตอนที่ต้องการแปลได้เลย");
    if (saved) {
      setProfileConfirmed(true);
      setStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function reviewTitle() {
    setBusy("review-title"); setError(""); setMessage("");
    try {
      const result = await mutate(`/api/admin/translation/workspaces/${data.workspace.id}/review-title`, "POST", {
        title: translatedTitle,
        synopsis: translatedSynopsis.trim() || null,
      }) as { review: TitleReview };
      setTitleReview(result.review);
      setMessage("AI ตรวจชื่อและเกลาเรื่องย่อแล้ว เลือกฉบับที่ต้องการแล้วกดบันทึกแนวทางการแปล");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ตรวจชื่อและเรื่องย่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function regenerateProfile() {
    if (!await dialogs.confirm({
      title: "สร้างแนวทางการแปลใหม่หรือไม่?",
      description: "ตอนที่ยังไม่เผยแพร่จะถูกนำกลับไปตรวจหรือแปลใหม่ ส่วนคลังคำและข้อมูลตัวละครจะยังคงอยู่",
      confirmLabel: "สร้างใหม่",
    })) return;
    setBusy("regenerate-profile"); setError(""); setMessage("");
    setProfileStage({ stage: "CONNECTING", label: "กำลังโหลดเรื่องย่อและตัวอย่าง 3 ตอนแรก", modelName: "เลือกโมเดลอัตโนมัติ" });
    try {
      const response = await fetch("/api/admin/translation/workspaces", {
        method: "POST",
        headers: { accept: "application/x-ndjson", "content-type": "application/json" },
        body: JSON.stringify({ importSourceId: data.workspace.importSourceId, targetLanguage: data.workspace.targetLanguage, regenerate: true }),
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let completed = false;
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as { type: string; stage?: string; label?: string; modelName?: string; error?: { message?: string } };
          if (event.type === "stage" && event.stage && event.label && event.modelName) setProfileStage({ stage: event.stage, label: event.label, modelName: event.modelName });
          if (event.type === "error") throw new Error(event.error?.message || "สร้างแนวทางการแปลใหม่ไม่สำเร็จ");
          if (event.type === "complete") completed = true;
        }
        if (done) break;
      }
      if (!completed) throw new Error("AI ทำงานเสร็จแต่ไม่ได้ยืนยันผลลัพธ์");
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างแนวทางการแปลใหม่ไม่สำเร็จ");
    } finally {
      setBusy(""); setProfileStage(null);
    }
  }

  async function enqueue() {
    if (!selected.size) { setError("เลือกอย่างน้อย 1 ตอน"); return; }
    if (activeJobs) { setError("มีงานแปลกำลังทำงานอยู่ กรุณารอให้งานปัจจุบันเสร็จก่อน"); return; }
    if (chapterAction === "PUBLISH") return;
    if (chapterAction === "POLISH" && [...selected].some((chapterId) => data.chapters.find((chapter) => chapter.id === chapterId)?.status === "PUBLISHED")) {
      const confirmed = await dialogs.confirm({
        title: "เกลาสำนวนตอนที่เผยแพร่แล้วหรือไม่?",
        description: "ระบบจะสร้างฉบับแก้ไขใหม่ ฉบับที่ผู้อ่านเห็นอยู่จะยังไม่เปลี่ยนจนกว่าคุณจะตรวจและเผยแพร่ฉบับใหม่",
        confirmLabel: "เริ่มเกลาสำนวน",
      });
      if (!confirmed) return;
    }
    const queued = await perform("enqueue", () => mutate(`/api/admin/translation/workspaces/${data.workspace.id}/jobs`, "POST", {
      operation: chapterAction,
      chapterIds: [...selected], idempotencyKey: `${data.workspace.id}:${chapterAction.toLocaleLowerCase()}:${crypto.randomUUID()}`,
    }), chapterAction === "POLISH"
      ? `เพิ่ม ${selected.size.toLocaleString("th-TH")} ตอนลงคิวเกลาสำนวนใหม่แล้ว`
      : `เพิ่ม ${selected.size.toLocaleString("th-TH")} ตอนลงคิวแปลแล้ว`);
    if (queued) setSelected(new Set());
  }

  async function polishSynopsisNow() {
    if (!await dialogs.confirm({
      title: "เกลาและอัปเดตเรื่องย่อนี้หรือไม่?",
      description: data.workspace.novelId
        ? "AI จะเทียบกับต้นฉบับ เกลาภาษาไทย และอัปเดตเรื่องย่อบนหน้าอ่านทันที โดยไม่เปลี่ยนชื่อเรื่อง"
        : "AI จะเทียบกับต้นฉบับและบันทึกเรื่องย่อฉบับเกลา โดยไม่เปลี่ยนชื่อเรื่อง",
      confirmLabel: "เกลาและอัปเดต",
    })) return;
    setBusy("polish-synopsis"); setError(""); setMessage("");
    try {
      const result = await mutate(`/api/admin/translation/workspaces/${data.workspace.id}/polish-synopsis`, "POST", {
        expectedVersion: data.workspace.version,
      }) as { synopsis: string | null; review: TitleReview };
      setTranslatedSynopsis(result.synopsis ?? "");
      setTitleReview(result.review);
      setMessage("เกลาและอัปเดตเรื่องย่อเรียบร้อยแล้ว");
      await dialogs.alert({
        title: "อัปเดตเรื่องย่อแล้ว",
        description: data.workspace.novelId ? "หน้าเรื่องสาธารณะใช้เรื่องย่อฉบับเกลาแล้ว" : "บันทึกเรื่องย่อฉบับเกลาไว้ในงานแปลแล้ว",
        tone: "success",
      });
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เกลาเรื่องย่อไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function publishSelected() {
    if (!selected.size) { setError("เลือกอย่างน้อย 1 ตอน"); return; }
    if (!await dialogs.confirm({
      title: `เผยแพร่ ${selected.size.toLocaleString("th-TH")} ตอนหรือไม่?`,
      description: "เนื้อหาของตอนที่เลือกจะขึ้นหน้าอ่านทันที โปรดตรวจชื่อและเนื้อหาก่อนดำเนินการ",
      confirmLabel: "เผยแพร่ตอนที่เลือก",
    })) return;
    setBusy("publish"); setError(""); setMessage("");
    try {
      const result = await mutate(`/api/admin/translation/workspaces/${data.workspace.id}/publish`, "POST", {
        chapterIds: [...selected],
      }) as BulkPublishResult;
      setSelected(new Set());
      if (result.failed > 0) {
        const sample = result.failures.slice(0, 3).map((failure) => `ตอน ${failure.chapterNumber}: ${failure.message}`).join(" · ");
        setError(`เผยแพร่สำเร็จ ${result.published.toLocaleString("th-TH")} ตอน ไม่สำเร็จ ${result.failed.toLocaleString("th-TH")} ตอน${sample ? ` — ${sample}` : ""}`);
        await dialogs.alert({ title: "เผยแพร่สำเร็จบางส่วน", description: `สำเร็จ ${result.published.toLocaleString("th-TH")} ตอน และไม่สำเร็จ ${result.failed.toLocaleString("th-TH")} ตอน${sample ? ` — ${sample}` : ""}`, tone: "warning" });
      } else {
        setMessage(`เผยแพร่ ${result.published.toLocaleString("th-TH")} ตอนเรียบร้อยแล้ว`);
        await dialogs.alert({ title: "เผยแพร่เรียบร้อยแล้ว", description: `${result.published.toLocaleString("th-TH")} ตอนพร้อมให้ผู้อ่านเปิดอ่านแล้ว`, tone: "success" });
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เผยแพร่ตอนที่เลือกไม่สำเร็จ");
    } finally {
      setBusy("");
    }
  }

  async function cancelJob(jobId: string) {
    if (!await dialogs.confirm({
      title: "ยกเลิกงาน AI นี้หรือไม่?",
      description: "ตอนที่ยังไม่เริ่มจะถูกนำออกจากคิว ส่วนตอนที่บันทึกสำเร็จแล้วจะยังคงอยู่",
      confirmLabel: "ยกเลิกงาน",
      tone: "danger",
    })) return;
    await perform(`cancel-${jobId}`, () => mutate(`/api/admin/translation/jobs/${jobId}/cancel`, "POST"), "ส่งคำสั่งยกเลิกแล้ว");
  }

  function selectFirst(count: number) {
    setSelected(new Set(eligibleChapters.slice(0, count).map((chapter) => chapter.id)));
  }

  function toggleVisible() {
    const candidates = visibleEligible.slice(0, 100);
    setSelected(allVisibleSelected ? new Set() : new Set(candidates.map((chapter) => chapter.id)));
  }

  function toggleChapter(chapterId: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) next.delete(chapterId);
      else if (next.size < 100) next.add(chapterId);
      return next;
    });
  }

  return <div className="grid gap-5">
    <Modal open={busy === "regenerate-profile"} onClose={() => {}} dismissible={false} size="lg" title="กำลังสร้างแนวทางการแปลใหม่" description="AI กำลังวิเคราะห์ตัวอย่างเนื้อหา เลือกแนวทางที่เหมาะสม และตรวจสำนวนก่อนบันทึก"><AiTranslationVisual active stage={profileStage?.stage} stageLabel={profileStage?.label} modelName={profileStage?.modelName} /></Modal>
    {error ? <div role="alert" className="rounded-[12px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    {message ? <div role="status" className="rounded-[12px] border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}
    {activeJob ? <AiTranslationProgress
      completed={activeJob.completedItems + activeJob.failedItems}
      total={activeJob.totalItems}
      label={activeJob.status === "QUEUED" ? "กำลังรอเริ่มงาน" : activeJob.operation === "POLISH" ? "AI กำลังเกลาสำนวน" : "AI กำลังแปล"}
      currentChapter={currentChapter?.chapterNumber}
      currentStage={currentChapter ? PROGRESS_STAGE_LABELS[currentChapter.progressStage] ?? currentChapter.progressStage : null}
      currentPercent={currentChapter?.progressPercent}
    /> : null}
    <div className="grid gap-4 rounded-[16px] border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/6 p-4 shadow-[var(--sh-1)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--brand-emphasis)]">ขั้นตอนที่แนะนำ</p>
        <h2 className="mt-1 text-lg font-bold">{activeJob ? "รอ AI ทำงานให้เสร็จ" : needsReviewCount > 0 ? `ตรวจงาน ${needsReviewCount.toLocaleString("th-TH")} ตอนที่ต้องแก้หรืออนุมัติ` : publishReadyCount > 0 ? `เผยแพร่ ${publishReadyCount.toLocaleString("th-TH")} ตอนที่พร้อม` : "เลือกตอนเพื่อเริ่มงานถัดไป"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">เผยแพร่แล้ว {publishedCount.toLocaleString("th-TH")} ตอน · พร้อมเผยแพร่ {publishReadyCount.toLocaleString("th-TH")} ตอน · ต้องตรวจ {needsReviewCount.toLocaleString("th-TH")} ตอน</p>
      </div>
      {!activeJob && publishReadyCount > 0 && canCancelJobs ? <Button type="button" onClick={() => { setChapterAction("PUBLISH"); setSelected(new Set(data.chapters.filter((chapter) => chapter.status === "APPROVED" && chapter.publishReady && chapter.criticalIssues === 0).slice(0, 100).map((chapter) => chapter.id))); document.getElementById("chapter-actions")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><CloudUpload className="h-4 w-4" />เลือกตอนที่พร้อมเผยแพร่</Button> : !activeJob && needsReviewCount > 0 ? <Button type="button" variant="outline" onClick={() => { setStatusFilter(data.chapters.some((chapter) => chapter.status === "QA_FAILED") ? "QA_FAILED" : "REVIEW"); document.getElementById("chapter-list")?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><TriangleAlert className="h-4 w-4" />ดูตอนที่ต้องตรวจ</Button> : null}
    </div>

    <details className="group rounded-[12px] border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold"><span className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-muted-foreground" />ข้อมูลระบบและการประหยัดค่าใช้จ่าย</span><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm"><p className="text-xs text-muted-foreground">ระบบเก็บแนวทางที่ใช้ซ้ำไว้ชั่วคราวเพื่อลดเวลาและค่าใช้จ่าย</p><div className="flex flex-wrap gap-2 text-xs tabular-nums"><span className="rounded-full border border-border bg-card px-2.5 py-1">คำขอ <strong>{data.aiUsage.cacheEnabledRequests.toLocaleString("th-TH")}</strong></span><span className="rounded-full border border-sky-500/20 bg-card px-2.5 py-1">นำข้อมูลเดิมมาใช้ <strong>{data.aiUsage.cacheHitPercent.toLocaleString("th-TH")}%</strong></span><span className="rounded-full border border-border bg-card px-2.5 py-1">หน่วยข้อความที่ประหยัด <strong>{data.aiUsage.cachedInputTokens.toLocaleString("th-TH")}</strong></span></div></div>
    </details>

    <TranslationSetupSteps activeStep={step} completedThrough={step === 2 ? 1 : 2} />

    {step === 2 ? (
      <form action={saveConfiguration} className="grid gap-5">
        <Panel title="ตรวจชื่อเรื่องและข้อมูลเบื้องต้น" description="AI เตรียมชื่อ เรื่องย่อ และแนวทางจากข้อมูลต้นฉบับ คุณแก้ไขได้ก่อนเริ่มแปล">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_280px]">
            <div className="rounded-[12px] border border-border bg-muted/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-emphasis)]"><Sparkles className="mr-1 inline h-3.5 w-3.5" />ข้อมูลที่ใช้วิเคราะห์</p>
              <h3 className="mt-2 font-semibold">{data.source.title}</h3>
              <p className="mt-2 max-h-36 overflow-auto text-sm leading-relaxed text-muted-foreground">{data.source.synopsis?.trim() || "ไม่มีเรื่องย่อจากต้นฉบับ ระบบจึงสร้างกฎแปลแบบทั่วไปให้ตรวจแก้"}</p>
            </div>
            <div className="grid gap-3 rounded-[12px] border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-emphasis)]"><Sparkles className="mr-1 inline h-3.5 w-3.5" />ฉบับแปลโดย AI · แก้ไขได้</p>
                <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" loading={busy === "review-title"} disabled={Boolean(busy)} onClick={reviewTitle}><Sparkles className="h-3.5 w-3.5" />ดูก่อนแก้ไข</Button><Button type="button" size="sm" loading={busy === "polish-synopsis"} disabled={Boolean(busy)} onClick={() => void polishSynopsisNow()}><Sparkles className="h-3.5 w-3.5" />เกลาและอัปเดตเรื่องย่อ</Button></div>
              </div>
              <Field label="ชื่อเรื่องฉบับแปล" hint="ชื่อนี้จะถูกใช้ในหน้าแรก หน้ารายละเอียด และระบบค้นหา"><Input value={translatedTitle} onChange={(event) => setTranslatedTitle(event.target.value)} required /></Field>
              <Field label="เรื่องย่อฉบับแปล"><Textarea value={translatedSynopsis} onChange={(event) => setTranslatedSynopsis(event.target.value)} className="min-h-32" /></Field>
            </div>
            <dl className="grid content-start gap-2 rounded-[12px] border border-border p-4 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ต้นทาง</dt><dd className="font-semibold">{data.workspace.sourceLanguage}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ปลายทาง</dt><dd className="font-semibold">{data.workspace.targetLanguage}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ต้นฉบับ</dt><dd className="max-w-40 truncate font-semibold">{data.source.provider}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ตอนที่พร้อม</dt><dd className="font-semibold">{eligibleChapters.length.toLocaleString("th-TH")}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">แนวนิยายที่ใช้</dt><dd className="max-w-44 text-right font-semibold">{data.profileAnalysis?.genreContext.label ?? "แนวทางรุ่นเดิม"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ชุดกฎที่ใช้</dt><dd className="max-w-44 text-right font-semibold">{data.profileAnalysis?.masterSelection?.mode === "MASTER" ? "รุ่นที่อนุมัติ" : "กฎสำรอง"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">ตัวอย่างที่อ่าน</dt><dd className="font-semibold">{data.profileAnalysis?.sampledChapters.length ? `${data.profileAnalysis.sampledChapters.length} ตอน` : "เฉพาะข้อมูลพื้นฐาน"}</dd></div>
            </dl>
          </div>
          {data.profileAnalysis?.masterSelection?.mode === "MASTER" ? (
            <details className="mt-4 rounded-[12px] border border-border bg-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold"><span>รายละเอียดกฎที่ AI เลือก</span><ChevronDown className="h-4 w-4 text-muted-foreground" /></summary>
              <div className="border-t border-border p-4"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">กฎและรูปแบบที่ใช้สร้างแนวทางนี้</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {data.profileAnalysis.masterSelection.baseProfile ? <span className="rounded-full border border-border bg-card px-2.5 py-1">Base · {data.profileAnalysis.masterSelection.baseProfile.name} · {data.profileAnalysis.masterSelection.baseProfile.id}@{data.profileAnalysis.masterSelection.baseProfile.version}</span> : null}
                {data.profileAnalysis.masterSelection.overlays.map((row) => <span key={row.id} className="rounded-full border border-border bg-card px-2.5 py-1">Overlay · {row.name} · {row.id}@{row.version}</span>)}
                {data.profileAnalysis.masterSelection.recipe ? <span className="rounded-full border border-border bg-card px-2.5 py-1">Recipe · {data.profileAnalysis.masterSelection.recipe.name} · {data.profileAnalysis.masterSelection.recipe.id}@{data.profileAnalysis.masterSelection.recipe.version}</span> : null}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Routing {data.profileAnalysis.masterSelection.routing?.method ?? "DETERMINISTIC"}{data.profileAnalysis.masterSelection.routing?.confidence !== null && data.profileAnalysis.masterSelection.routing?.confidence !== undefined ? ` · confidence ${data.profileAnalysis.masterSelection.routing.confidence}%` : ""} · Scene {data.profileAnalysis.masterSelection.sceneCandidates.length} รายการเป็นเพียง candidate และจะใช้เมื่อเนื้อหาตอนนั้นเข้าเงื่อนไขเท่านั้น · Global rules {data.profileAnalysis.masterSelection.globalRuleVersions.length} รายการ</p>
              </div>
            </details>
          ) : null}
          {titleReview ? (
            <div className="mt-4 rounded-[12px] border border-sky-500/25 bg-sky-500/8 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">ผลตรวจชื่อและเรื่องย่อ</p>{translatedTitle !== titleReview.reviewedTitle || (titleReview.reviewedSynopsis !== undefined && translatedSynopsis !== (titleReview.reviewedSynopsis ?? "")) ? <p className="text-xs text-amber-700 dark:text-amber-300">ข้อความถูกแก้หลังการตรวจ — กดตรวจอีกครั้งเพื่อประเมินฉบับปัจจุบัน</p> : null}</div><div className="flex flex-wrap gap-1.5 text-xs font-bold"><span className="rounded-full bg-card px-2.5 py-1">ชื่อ {titleReview.score}/100</span>{titleReview.synopsisScore !== undefined ? <span className="rounded-full bg-card px-2.5 py-1">เรื่องย่อ {titleReview.synopsisScore}/100</span> : null}{titleReview.fidelityScore !== undefined ? <span className="rounded-full bg-card px-2.5 py-1">ตรงต้นฉบับ {titleReview.fidelityScore}/100</span> : null}</div></div>
              {titleReview.issues.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{titleReview.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">ไม่พบจุดผิดธรรมชาติที่สำคัญ</p>}
              <div className="mt-3 grid gap-2 md:grid-cols-2">{titleReview.candidates.map((candidate) => <div key={candidate.title} className={`rounded-[10px] border p-3 ${candidate.title === titleReview.recommendedTitle ? "border-[var(--brand-primary)] bg-card" : "border-border bg-card/70"}`}><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{candidate.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{candidate.rationale}</p></div><Button type="button" size="sm" variant={translatedTitle === candidate.title ? "secondary" : "outline"} onClick={() => { setTranslatedTitle(candidate.title); setMessage(`เลือกชื่อ “${candidate.title}” แล้ว กดบันทึกแนวทางเพื่อใช้งานจริง`); }}>{translatedTitle === candidate.title ? "เลือกแล้ว" : "ใช้ชื่อนี้"}</Button></div></div>)}</div>
              {titleReview.recommendedSynopsis !== undefined && titleReview.recommendedSynopsis !== null ? <div className="mt-3 rounded-[10px] border border-[var(--brand-primary)]/25 bg-card p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">เรื่องย่อฉบับเกลา</p><p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{titleReview.recommendedSynopsis}</p></div><Button type="button" size="sm" variant={translatedSynopsis === titleReview.recommendedSynopsis ? "secondary" : "outline"} onClick={() => { setTranslatedSynopsis(titleReview.recommendedSynopsis ?? ""); setMessage("เลือกเรื่องย่อฉบับเกลาแล้ว กดบันทึกแนวทางเพื่ออัปเดตหน้าเรื่อง"); }}>{translatedSynopsis === titleReview.recommendedSynopsis ? "เลือกแล้ว" : "ใช้เรื่องย่อนี้"}</Button></div></div> : null}
              <p className="mt-3 text-[11px] text-muted-foreground">ตรวจด้วย {titleReview.modelName} · {(titleReview.latencyMs / 1_000).toFixed(1)} วินาที</p>
            </div>
          ) : null}
          {data.profileAiPipeline.length ? (
            <div className="mt-4 rounded-[12px] border border-emerald-500/25 bg-emerald-500/8 p-3">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />สร้างด้วย AI จริงครบ {data.profileAiPipeline.length} ขั้นตอน</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.profileAiPipeline.map((run) => <span key={run.task} className="rounded-full border border-emerald-500/20 bg-card px-2.5 py-1 text-[11px] text-muted-foreground">{run.task} · <strong className="text-foreground">{run.modelName}</strong> · {(run.latencyMs / 1_000).toFixed(1)}s</span>)}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-[12px] border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">แนวทางเดิมนี้สร้างก่อนเปิดระบบวิเคราะห์อัตโนมัติ หากต้องการใช้กฎรุ่นใหม่ให้กด “ให้ AI สร้างแนวทางใหม่”</div>
          )}
        </Panel>

        <Panel title="2. ตรวจแนวทางการแปล" description={`ฉบับที่ ${data.profile?.version ?? 1} · หากค่าที่ AI แนะนำเหมาะสม สามารถบันทึกแล้วเริ่มแปลได้ทันที`} action={<Button type="button" size="sm" variant="outline" disabled={activeJobs} loading={busy === "regenerate-profile"} onClick={() => void regenerateProfile()}><Sparkles className="h-4 w-4" />ให้ AI สร้างแนวทางใหม่</Button>}>
          <div className="mb-4 flex items-start gap-3 rounded-[12px] border border-emerald-500/25 bg-emerald-500/8 p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-semibold">แนวทางที่ AI แนะนำพร้อมใช้งาน</p><p className="mt-1 text-sm text-muted-foreground">หากชื่อเรื่องและเรื่องย่อด้านบนถูกต้อง คุณสามารถกด “บันทึกและจัดการตอน” ได้เลย</p></div></div>
          <details className="group rounded-[12px] border border-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold"><span>ปรับสำนวนและคำสั่งขั้นสูง</span><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="grid gap-4 border-t border-border p-4 md:grid-cols-2">
            <Field label="ชื่อชุดแนวทาง" hint="ใช้แยกเมื่อเรื่องเดียวกันมีแนวการแปลหลายแบบ"><Input name="profileName" required defaultValue={data.profile?.name ?? "แนวทางหลัก"} /></Field>
            <div className="rounded-[10px] bg-muted px-3 py-2 text-sm text-muted-foreground">นิยายสาธารณะ: {data.workspace.novelId ? "สร้างแล้ว" : "จะสร้างเป็น Draft เมื่ออนุมัติตอนแรก"}</div>
            <div className="md:col-span-2"><Field label="Style guide" hint="กฎน้ำเสียง สำนวน ชื่อเฉพาะ และรูปแบบการเขียน"><Textarea name="styleGuide" className="min-h-48" defaultValue={data.profile?.styleGuide ?? ""} /></Field></div>
            <div className="md:col-span-2"><Field label="บริบทและคำสั่งเพิ่มเติม" hint="ตรวจว่าชื่อเรื่องและเรื่องย่อถูกต้องก่อนบันทึก"><Textarea name="instructions" className="min-h-40" defaultValue={data.profile?.instructions ?? ""} /></Field></div>
            <label className="flex items-center gap-2 text-sm"><input name="preserveParagraphs" type="checkbox" defaultChecked={data.profile?.preserveParagraphs ?? true} /> รักษาการแบ่งย่อหน้าต้นฉบับ</label>
          </div>
          </details>
        </Panel>

        <details className="group rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">คลังคำตลอดทั้งเรื่อง <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">ล็อก {glossary.filter((entry) => entry.isLocked).length} · AI เสนอ {glossary.filter((entry) => !entry.isLocked).length} <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span></summary>
          <div className="grid gap-3 border-t border-border p-5">
            <p className="text-sm text-muted-foreground">คำที่ล็อกเป็นกฎบังคับและถูกตรวจซ้ำด้วยระบบ ส่วนคำที่ AI พบระหว่างแปลจะถูกเก็บแบบ “เสนอ” ให้ตรวจแก้และติ๊กล็อกก่อนใช้เป็นกฎถาวรในตอนถัดไป</p>
            {glossary.map((entry, index) => <div key={entry.id ?? index} className="grid gap-2 md:grid-cols-[1fr_1fr_1.4fr_auto_auto]">
              <Input aria-label="คำต้นฉบับ" value={entry.sourceTerm} placeholder="คำต้นฉบับ" onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, sourceTerm: event.target.value } : row))} />
              <Input aria-label="คำแปล" value={entry.targetTerm} placeholder="คำแปลที่กำหนด" onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, targetTerm: event.target.value } : row))} />
              <Input aria-label="หมายเหตุ" value={entry.note ?? ""} placeholder="หมายเหตุ" onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, note: event.target.value } : row))} />
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={entry.isLocked} onChange={(event) => setGlossary((rows) => rows.map((row, i) => i === index ? { ...row, isLocked: event.target.checked } : row))} />ล็อก</label>
              <Button type="button" variant="ghost" size="icon" aria-label="ลบคำศัพท์" onClick={() => setGlossary((rows) => rows.filter((_, i) => i !== index))}><XCircle className="h-4 w-4" /></Button>
            </div>)}
            <Button type="button" variant="outline" className="justify-self-start" onClick={() => setGlossary((rows) => [...rows, { id: crypto.randomUUID(), workspaceId: data.workspace.id, sourceTerm: "", targetTerm: "", note: null, isLocked: true, version: 1, createdBy: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])}>เพิ่มคำศัพท์</Button>
          </div>
        </details>

        <details className="group rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold">ตัวละครเริ่มต้น <span className="flex items-center gap-2 text-xs font-normal text-muted-foreground">{characters.length} คน <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></span></summary>
          <div className="grid gap-3 border-t border-border p-5">
            <p className="text-sm text-muted-foreground">กำหนดชื่อและลักษณะการพูดที่ต้องคงเส้นคงวา สามารถเพิ่มระหว่างตรวจงานได้</p>
            {characters.map((character, index) => <div key={character.id ?? index} className="grid gap-2 rounded-[10px] border border-border p-3 md:grid-cols-2">
              <Input aria-label="ชื่อต้นฉบับ" value={character.sourceName} placeholder="ชื่อต้นฉบับ" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, sourceName: event.target.value } : row))} />
              <Input aria-label="ชื่อแปล" value={character.targetName} placeholder="ชื่อแปล" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, targetName: event.target.value } : row))} />
              <Input aria-label="ชื่อเรียกอื่น" value={character.aliases.join(", ")} placeholder="ชื่อเรียกอื่น คั่นด้วยจุลภาค" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, aliases: event.target.value.split(",").map((value) => value.trim()).filter(Boolean) } : row))} />
              <Input aria-label="ลักษณะการพูด" value={character.speakingStyle ?? ""} placeholder="ลักษณะการพูด" onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, speakingStyle: event.target.value } : row))} />
              <div className="flex items-center gap-3 md:col-span-2"><label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={character.isLocked} onChange={(event) => setCharacters((rows) => rows.map((row, i) => i === index ? { ...row, isLocked: event.target.checked } : row))} />ล็อก</label><Button type="button" variant="ghost" size="sm" onClick={() => setCharacters((rows) => rows.filter((_, i) => i !== index))}>ลบ</Button></div>
            </div>)}
            <Button type="button" variant="outline" className="justify-self-start" onClick={() => setCharacters((rows) => [...rows, { id: crypto.randomUUID(), workspaceId: data.workspace.id, sourceName: "", targetName: "", aliases: [], description: null, speakingStyle: null, isLocked: true, version: 1, createdBy: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }])}>เพิ่มตัวละคร</Button>
          </div>
        </details>

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--brand-primary)]/25 bg-card/95 p-3 shadow-[var(--sh-2)] backdrop-blur">
          <p className="text-sm text-muted-foreground"><CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-600" />ใช้ค่าที่ AI แนะนำได้ หรือปรับเฉพาะจุดที่ต้องการ</p>
          <Button type="submit" loading={busy === "save"} disabled={activeJobs}><Save className="h-4 w-4" />{activeJobs ? "รองาน AI จบก่อนบันทึก" : "บันทึกและจัดการตอน"}</Button>
        </div>
      </form>
    ) : (
      <div className="grid gap-5">
        <div id="chapter-actions" className="scroll-mt-24"><Panel
          title="3. เลือกตอนและสิ่งที่ต้องการทำ"
          description="แปล เกลาสำนวน หรือเผยแพร่พร้อมกันได้สูงสุด 100 ตอน"
          action={<Button type="button" variant="outline" loading={busy === "sync"} onClick={() => perform("sync", () => mutate(`/api/admin/translation/workspaces/${data.workspace.id}/sync`, "POST"), "ซิงก์ต้นฉบับแล้ว")}><RefreshCw className="h-4 w-4" />ซิงก์ต้นฉบับ</Button>}
        >
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] bg-muted/50 p-3">
              <div><p className="text-sm font-semibold">แนวทางการแปลพร้อมใช้งาน</p><p className="text-xs text-muted-foreground">{data.profile?.name ?? "แนวทางหลัก"} · ฉบับที่ {data.profile?.version ?? 1} · คลังคำ {data.glossary.length} คำ ({data.glossary.filter((entry) => !entry.isLocked).length} คำรอตรวจ)</p></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setGlossary(data.glossary); setStep(2); }}><ArrowLeft className="h-4 w-4" />แก้ชื่อและแนวทางการแปล</Button>
            </div>

            <div className={`grid gap-2 rounded-[12px] border border-border p-2 ${canCancelJobs ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <Button type="button" variant={chapterAction === "TRANSLATE" ? "default" : "ghost"} onClick={() => { setChapterAction("TRANSLATE"); setSelected(new Set()); }}>
                <Bot className="h-4 w-4" />แปลจากต้นฉบับ
              </Button>
              <Button type="button" variant={chapterAction === "POLISH" ? "default" : "ghost"} onClick={() => { setChapterAction("POLISH"); setSelected(new Set()); }}>
                <Sparkles className="h-4 w-4" />เกลาสำนวนฉบับเดิม
              </Button>
              {canCancelJobs ? <Button type="button" variant={chapterAction === "PUBLISH" ? "default" : "ghost"} onClick={() => { setChapterAction("PUBLISH"); setSelected(new Set()); }}>
                <CloudUpload className="h-4 w-4" />เผยแพร่หลายตอน
              </Button> : null}
              <p className={`px-2 pb-1 text-xs text-muted-foreground ${canCancelJobs ? "sm:col-span-3" : "sm:col-span-2"}`}>
                {chapterAction === "PUBLISH"
                  ? "เลือกตอนที่อนุมัติและตรวจผ่านแล้ว จากนั้นเผยแพร่ขึ้นหน้าอ่านได้ในครั้งเดียว"
                  : chapterAction === "POLISH"
                  ? "AI จะเทียบต้นฉบับกับคำแปลล่าสุด เกลาให้เป็นสำนวนไทย และสร้างฉบับแก้ไขใหม่โดยไม่เขียนทับฉบับที่เผยแพร่"
                  : "สร้างคำแปลใหม่จากต้นฉบับ พร้อมตรวจความสม่ำเสมอ คลังคำ และคุณภาพอัตโนมัติ"}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" /><Input className="pl-9" value={chapterQuery} onChange={(event) => setChapterQuery(event.target.value)} placeholder="ค้นหาเลขตอนหรือชื่อตอน" aria-label="ค้นหาตอน" /></div>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="กรองสถานะ"><option value="ALL">ทุกสถานะ</option>{[...new Set(data.chapters.map((chapter) => chapter.status))].sort().map((status) => <option key={status} value={status}>{translationStatusLabel(status)}</option>)}</Select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-semibold text-muted-foreground">เลือกด่วน</span>
              <Button type="button" size="sm" variant="outline" onClick={() => selectFirst(10)}>10 ตอนแรก</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => selectFirst(50)}>50 ตอนแรก</Button>
              <Button type="button" size="sm" variant="outline" onClick={() => selectFirst(100)}>100 ตอนแรก</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>ล้างที่เลือก</Button>
              <span className="ml-auto rounded-full bg-[var(--brand-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--brand-emphasis)]">เลือกแล้ว {selected.size} / 100</span>
            </div>
          </div>
        </Panel></div>

        <div id="chapter-list" className="scroll-mt-24"><Panel title={`ตอนทั้งหมด (${data.chapters.length.toLocaleString("th-TH")})`} description={`แสดง ${visibleChapters.length.toLocaleString("th-TH")} ตอน · เลือกทำรายการได้ ${visibleEligible.length.toLocaleString("th-TH")} ตอน`} bodyClassName="p-0">
          <div className="grid max-h-[620px] gap-2 overflow-auto p-3 md:hidden">{visibleChapters.map((chapter) => { const eligible = eligibleChapterIds.has(chapter.id); return <div key={chapter.id} className={`rounded-[12px] border p-3 ${selected.has(chapter.id) ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5" : "border-border bg-card"}`}><div className="flex items-start gap-3"><input className="mt-1 h-5 w-5 shrink-0 accent-[var(--brand-primary)]" type="checkbox" disabled={!eligible} checked={selected.has(chapter.id)} aria-label={`เลือกตอน ${chapter.chapterNumber}`} onChange={() => toggleChapter(chapter.id)} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><Link className="line-clamp-2 font-semibold hover:underline" href={`/admin/translation/${data.workspace.id}/chapters/${chapter.id}`}>ตอน {chapter.chapterNumber}: {chapter.sourceTitle || `Chapter ${chapter.chapterNumber}`}</Link><StatusPill label={translationStatusLabel(chapter.status)} tone={translationStatusTone(chapter.status)} /></div><p className="mt-2 text-xs text-muted-foreground">ฉบับแก้ไข {chapter.revision} · {chapter.criticalIssues ? `${chapter.criticalIssues} ปัญหาสำคัญ` : "ตรวจผ่าน"}</p>{!eligible ? <p className="mt-1 text-xs text-muted-foreground">ตอนนี้ยังไม่สามารถทำรายการที่เลือกกับตอนนี้ได้</p> : null}</div></div></div>; })}{!visibleChapters.length ? <div className="px-4 py-10 text-center text-sm text-muted-foreground">ไม่พบตอนที่ตรงกับตัวกรอง</div> : null}</div>
          <div className="hidden max-h-[620px] overflow-auto md:block"><table className="w-full min-w-[920px] text-sm"><thead className="sticky top-0 z-10 bg-muted"><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-4 py-3"><input type="checkbox" checked={allVisibleSelected} aria-label="เลือกตอนที่แสดง สูงสุด 100 ตอน" onChange={toggleVisible} /></th><th className="px-4 py-3">ตอน</th><th className="px-4 py-3">ชื่อต้นฉบับ</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ความคืบหน้า</th><th className="px-4 py-3">ฉบับแก้ไข</th><th className="px-4 py-3">การตรวจ</th><th className="px-4 py-3" /></tr></thead><tbody>
            {visibleChapters.map((chapter) => {
              const eligible = eligibleChapterIds.has(chapter.id);
              const progress = chapter.jobItemStatus ? chapter.progressPercent : chapter.status === "PUBLISHED" || chapter.status === "APPROVED" || chapter.revision > 0 ? 100 : 0;
              const stage = chapter.jobItemStatus ? PROGRESS_STAGE_LABELS[chapter.progressStage] ?? chapter.progressStage : progress === 100 ? "มีฉบับแปลแล้ว" : "ยังไม่เริ่ม";
              return <tr key={chapter.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3"><input type="checkbox" disabled={!eligible} checked={selected.has(chapter.id)} aria-label={`เลือกตอน ${chapter.chapterNumber}`} title={eligible ? undefined : "สถานะตอนนี้ไม่รองรับรายการที่เลือก"} onChange={() => toggleChapter(chapter.id)} /></td><td className="px-4 py-3 font-semibold tabular">{chapter.chapterNumber}</td><td className="max-w-md truncate px-4 py-3">{chapter.sourceTitle || `Chapter ${chapter.chapterNumber}`}</td><td className="px-4 py-3"><StatusPill label={translationStatusLabel(chapter.status)} tone={translationStatusTone(chapter.status)} /></td><td className="w-40 px-4 py-3"><div className="flex items-center justify-between gap-2 text-[11px]"><span className="truncate text-muted-foreground">{stage}</span><strong className="tabular-nums">{progress}%</strong></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div></td><td className="px-4 py-3 tabular">{chapter.revision}</td><td className="px-4 py-3">{chapter.criticalIssues ? <span className="text-destructive">{chapter.criticalIssues} ปัญหาสำคัญ</span> : "ผ่าน"}</td><td className="px-4 py-3 text-right"><Link className="font-semibold text-[var(--brand-light-on-light)] hover:underline" href={`/admin/translation/${data.workspace.id}/chapters/${chapter.id}`}>ตรวจตอน</Link></td></tr>;
            })}
            {!visibleChapters.length ? <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">ไม่พบตอนที่ตรงกับตัวกรอง</td></tr> : null}
          </tbody></table></div>
          <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
            <p className="text-sm text-muted-foreground"><ListChecks className="mr-1 inline h-4 w-4" />เลือก {selected.size.toLocaleString("th-TH")} ตอน {chapterAction === "PUBLISH" ? "· พร้อมเผยแพร่" : activeJobs ? "· มีงาน AI กำลังทำงาน" : `· พร้อม${chapterAction === "POLISH" ? "เกลาสำนวน" : "สร้างคำแปล"}`}</p>
            <Button
              type="button"
              loading={busy === (chapterAction === "PUBLISH" ? "publish" : "enqueue")}
              disabled={!profileConfirmed || !selected.size || (chapterAction !== "PUBLISH" && activeJobs)}
              onClick={chapterAction === "PUBLISH" ? publishSelected : enqueue}
            >
              {chapterAction === "PUBLISH" ? <CloudUpload className="h-4 w-4" /> : chapterAction === "POLISH" ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              {chapterAction === "PUBLISH" ? "เผยแพร่ตอนที่เลือก" : chapterAction === "POLISH" ? "เกลาสำนวนตอนที่เลือก" : "เริ่มแปลตอนที่เลือก"}
            </Button>
          </div>
        </Panel></div>

        <Panel title="ประวัติงาน AI" description="ดูผลของงานล่าสุดและจำนวนตอนที่มีปัญหา" bodyClassName="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">เริ่มเมื่อ</th><th className="px-4 py-3">ประเภทงาน</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ความคืบหน้า</th><th className="px-4 py-3">รายละเอียดปัญหา</th><th className="px-4 py-3" /></tr></thead><tbody>{data.jobs.map((job) => <tr key={job.id} className="border-b border-border/70 last:border-0"><td className="whitespace-nowrap px-4 py-3">{new Date(job.createdAt).toLocaleString("th-TH")}</td><td className="px-4 py-3">{job.operation === "POLISH" ? "เกลาสำนวน" : "แปลต้นฉบับ"}</td><td className="px-4 py-3"><StatusPill label={translationStatusLabel(job.status)} tone={translationStatusTone(job.status)} /></td><td className="px-4 py-3 tabular">{job.completedItems + job.failedItems} / {job.totalItems}{job.failedItems ? ` · ไม่สำเร็จ ${job.failedItems}` : ""}</td><td className="max-w-sm px-4 py-3 text-xs text-destructive">{job.lastError || "—"}</td><td className="px-4 py-3 text-right">{canCancelJobs && (job.status === "QUEUED" || job.status === "RUNNING") ? <Button type="button" variant="ghost" size="sm" onClick={() => void cancelJob(job.id)}>ยกเลิก</Button> : null}</td></tr>)}{!data.jobs.length ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">ยังไม่มีงาน AI เลือกตอนด้านบนเพื่อเริ่มงานแรก</td></tr> : null}</tbody></table></div></Panel>
      </div>
    )}
  </div>;
}
