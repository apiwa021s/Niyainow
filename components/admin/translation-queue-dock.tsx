"use client";

import Link from "next/link";
import { Bot, ChevronDown, ChevronUp, Clock3, ExternalLink, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

type QueueItem = {
  status: string;
  progressPercent: number;
  progressStage: string;
  chapterNumber: number;
  title: string | null;
};

type QueueJob = {
  id: string;
  workspaceId: string;
  status: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  progressPercent: number;
  title: string;
  currentItem: QueueItem | null;
};

const STAGE_LABELS: Record<string, string> = {
  QUEUED: "รอ Worker รับงาน",
  CONTEXT: "กำลังเตรียมบริบท",
  CANON_ANALYSIS: "AI กำลังวิเคราะห์เนื้อหาและ Canon",
  AI_REQUEST: "AI กำลังแปลฉบับหลัก",
  AI_QA: "AI กำลังตรวจเทียบต้นฉบับ",
  ESCALATION: "AI รุ่นใหญ่กำลังแก้จุดผิดพลาด",
  CODE_QA: "ระบบกำลังตรวจ Glossary และโครงสร้าง",
  SAVING: "กำลังบันทึกฉบับร่าง",
  DONE: "เสร็จแล้ว",
  FAILED: "แปลไม่สำเร็จ",
  CANCELLED: "ยกเลิกแล้ว",
};

export function TranslationQueueDock() {
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/admin/translation/queue", { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { jobs?: QueueJob[] };
        if (active) setJobs(payload.jobs ?? []);
      } catch {
        // Keep the last known queue visible during a transient network failure.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 4_000);
    const onVisibility = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  if (!jobs.length) return null;

  const hasRunningJob = jobs.some((job) => job.status === "RUNNING");
  const overallPercent = Math.round(jobs.reduce((sum, job) => sum + job.progressPercent * job.totalItems, 0) / Math.max(1, jobs.reduce((sum, job) => sum + job.totalItems, 0)));

  return (
    <aside aria-label="สถานะคิวแปล AI" aria-live="polite" className="fixed bottom-4 right-4 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[16px] border border-[var(--brand-primary)]/30 bg-card/95 shadow-[var(--sh-3)] backdrop-blur-xl">
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--brand-primary)]/12 text-[var(--brand-emphasis)]"><Bot className="h-5 w-5" />{hasRunningJob ? <LoaderCircle className="absolute -right-1 -top-1 h-4 w-4 animate-spin rounded-full bg-card text-[var(--brand-primary)]" /> : <Clock3 className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-card text-[var(--brand-primary)]" />}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><strong className="truncate text-sm">{hasRunningJob ? "AI pipeline กำลังทำงาน" : "คิวกำลังรอ Worker"}</strong><span className="tabular-nums text-xs font-bold text-[var(--brand-emphasis)]">{overallPercent}%</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500" style={{ width: `${overallPercent}%` }} /></div>
        </div>
        <button type="button" onClick={() => setCollapsed((value) => !value)} aria-expanded={!collapsed} aria-label={collapsed ? "ขยายสถานะคิวแปล" : "ย่อสถานะคิวแปล"} className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">{collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
      </div>

      {!collapsed ? (
        <div className="max-h-[55vh] overflow-y-auto border-t border-border px-4 py-3">
          <p className="mb-3 text-xs leading-relaxed text-muted-foreground">ออกจากหน้า Workspace ได้ ระบบยังแปลต่อและกล่องนี้จะติดตามคิวให้ทุกหน้า Admin</p>
          <div className="grid gap-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-[12px] border border-border bg-muted/35 p-3">
                <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{job.title}</p><p className="mt-0.5 text-xs text-muted-foreground">เสร็จ {job.completedItems + job.failedItems} / {job.totalItems} ตอน{job.failedItems ? ` · ผิดพลาด ${job.failedItems}` : ""}</p></div><span className="tabular-nums rounded-full bg-card px-2 py-1 text-xs font-bold">{job.progressPercent}%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-[var(--brand-primary)] transition-[width] duration-500" style={{ width: `${job.progressPercent}%` }} /></div>
                {job.currentItem ? <p className="mt-2 truncate text-xs text-muted-foreground"><span className="font-semibold text-foreground">ตอน {job.currentItem.chapterNumber}</span> · {STAGE_LABELS[job.currentItem.progressStage] ?? job.currentItem.progressStage} · {job.currentItem.progressPercent}%</p> : null}
                <Link href={`/admin/translation/${job.workspaceId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-light-on-light)] hover:underline">เปิด Workspace <ExternalLink className="h-3 w-3" /></Link>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}
