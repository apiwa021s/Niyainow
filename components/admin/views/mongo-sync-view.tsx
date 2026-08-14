"use client";

import { AlertCircle, CheckCircle2, Coins, Database, Play, RefreshCw, Search, Timer } from "lucide-react";
import { useMemo, useState } from "react";

import { AdminPageHeader, DetailRow, Panel, StatCard } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";

type SyncSummary = {
  dryRun: boolean;
  mode: string;
  selectedBooks: number;
  completedBooks: number;
  partialBooks: number;
  importedChapters: number;
  paidChapters: number;
  skippedChapters: number;
  processedSourceChapters: number;
  coverCandidates: number;
  uploadedCovers: number;
  skippedCovers: number;
  stoppedForRuntime: boolean;
  backfillComplete: boolean;
  incrementalDue: boolean;
  nextAfterBookId: string | null;
  currentBookId: string | null;
  currentChapterOffset: number | null;
};

type SyncStatus = {
  backfill: {
    completed: boolean;
    completedAt: string | null;
    afterBookId: string | null;
    currentBookId: string | null;
    chapterOffset: number;
  };
  incremental: {
    active: boolean;
    lastSweepCompletedAt: string | null;
    nextDueAt: string | null;
    dueNow: boolean;
    currentBookId: string | null;
    chapterOffset: number;
    sweepUntil: string | null;
  };
  postgres: {
    novels: number;
    publishedNovels: number;
    chapters: number;
    paidChapters: number;
    covers: number;
  };
  mongo:
    | {
        configured: true;
        targetBooks: number;
        backfillProcessedBooks: number | null;
        nextBackfillBook: {
          bookId: string;
          bookName: string;
          totalChapters?: number;
          lastChapterUpdatedAt?: string;
        } | null;
      }
    | { configured: false; error: string };
  lastRun: { at: string; mode: string; dryRun: boolean; summary: Partial<SyncSummary> } | null;
};

type ApiPayload = {
  status: SyncStatus;
  result?: SyncSummary;
  error?: { message?: string };
};

const commandConfig = {
  auto: {
    execute: true,
    mode: "auto",
    limit: 1,
    chapterLimit: 100,
    maxRuntimeSeconds: 240,
    skipImages: false,
  },
  dryRun: {
    execute: false,
    mode: "auto",
    limit: 1,
    chapterLimit: 100,
    maxRuntimeSeconds: 120,
    skipImages: true,
  },
  incremental: {
    execute: true,
    mode: "incremental",
    limit: 1,
    chapterLimit: 100,
    maxRuntimeSeconds: 240,
    skipImages: false,
  },
} as const;

function formatNumber(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("th-TH");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function summaryValue(summary: Partial<SyncSummary> | null | undefined, key: keyof SyncSummary) {
  return summary?.[key] ?? "-";
}

async function requestStatus() {
  const response = await fetch("/api/admin/sync/mongo-translated-novels", {
    headers: { Accept: "application/json" },
  });
  const payload = (await response.json()) as ApiPayload;
  if (!response.ok) throw new Error(payload.error?.message || "โหลดสถานะไม่สำเร็จ");
  return payload.status;
}

async function runCommand(command: keyof typeof commandConfig) {
  const response = await fetch("/api/admin/sync/mongo-translated-novels", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(commandConfig[command]),
  });
  const payload = (await response.json()) as ApiPayload;
  if (!response.ok) throw new Error(payload.error?.message || "สั่ง sync ไม่สำเร็จ");
  return payload;
}

export function MongoSyncView({ initialStatus }: { initialStatus: SyncStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [lastResult, setLastResult] = useState<SyncSummary | null>(null);
  const [busy, setBusy] = useState<keyof typeof commandConfig | "refresh" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const progress = useMemo(() => {
    if (!status.mongo.configured || status.mongo.targetBooks === 0) return 0;
    return Math.min(100, Math.round(((status.mongo.backfillProcessedBooks ?? 0) / status.mongo.targetBooks) * 100));
  }, [status.mongo]);

  const lastSummary = lastResult ?? status.lastRun?.summary ?? null;
  const currentBookLabel = status.backfill.currentBookId
    ?? (status.mongo.configured && status.mongo.nextBackfillBook ? status.mongo.nextBackfillBook.bookName : "-");

  const refresh = async () => {
    setBusy("refresh");
    setMessage(null);
    try {
      setStatus(await requestStatus());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "โหลดสถานะไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  const execute = async (command: keyof typeof commandConfig) => {
    setBusy(command);
    setMessage(null);
    try {
      const payload = await runCommand(command);
      setStatus(payload.status);
      setLastResult(payload.result ?? null);
      setMessage(payload.result?.dryRun ? "Dry run เสร็จแล้ว" : "Sync รอบนี้เสร็จแล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "สั่ง sync ไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  };

  const backfillTone = status.backfill.completed ? "success" : status.backfill.currentBookId ? "warning" : "info";
  const incrementalTone = status.incremental.active ? "warning" : status.incremental.dueNow ? "brand" : "neutral";

  return (
    <>
      <AdminPageHeader
        title="Mongo Sync"
        description="ควบคุมการนำเข้านิยายแปลจาก MongoDB เข้า PostgreSQL และติดตาม cursor ของ job"
        actions={
          <>
            <Button type="button" variant="outline" onClick={refresh} loading={busy === "refresh"}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={() => execute("dryRun")} loading={busy === "dryRun"}>
              <Search className="h-4 w-4" />
              Dry run
            </Button>
            <Button type="button" onClick={() => execute("auto")} loading={busy === "auto"}>
              <Play className="h-4 w-4" />
              Auto sync
            </Button>
          </>
        }
      />

      {message ? (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-border bg-card px-4 py-3 text-sm">
          {message.includes("ไม่สำเร็จ") ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          <span>{message}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Mongo target" value={status.mongo.configured ? status.mongo.targetBooks : "N/A"} hint={`${progress}% backfill`} icon={<Database className="h-5 w-5" />} />
        <StatCard label="Postgres novels" value={status.postgres.publishedNovels} hint={`${formatNumber(status.postgres.covers)} เรื่องมีปก`} icon={<Database className="h-5 w-5" />} />
        <StatCard label="Postgres chapters" value={status.postgres.chapters} hint={`${formatNumber(status.postgres.paidChapters)} ตอนติดเหรียญ`} icon={<Coins className="h-5 w-5" />} />
        <StatCard label="Next sweep" value={status.incremental.dueNow ? "Due" : formatDate(status.incremental.nextDueAt)} hint="Incremental every 2 days" icon={<Timer className="h-5 w-5" />} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="Sync control"
          description="คำสั่งจากหน้านี้รันแบบ bounded รอบละ 1 เรื่อง และตัดตอนเป็น chunk ละ 100 ตอน"
          action={
            <Button type="button" variant="secondary" onClick={() => execute("incremental")} loading={busy === "incremental"}>
              <RefreshCw className="h-4 w-4" />
              Sync new chapters
            </Button>
          }
        >
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Backfill progress</span>
              <span className="tabular text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[image:var(--grad-primary)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <dl>
            <DetailRow label="Backfill status"><StatusPill label={status.backfill.completed ? "Complete" : status.backfill.currentBookId ? "Chunking" : "Running"} tone={backfillTone} /></DetailRow>
            <DetailRow label="Processed books">{status.mongo.configured ? `${formatNumber(status.mongo.backfillProcessedBooks)} / ${formatNumber(status.mongo.targetBooks)}` : "Mongo unavailable"}</DetailRow>
            <DetailRow label="Current book">{currentBookLabel}</DetailRow>
            <DetailRow label="Chapter offset">{formatNumber(status.backfill.chapterOffset)}</DetailRow>
            <DetailRow label="After bookId">{status.backfill.afterBookId ?? "-"}</DetailRow>
            <DetailRow label="Incremental"><StatusPill label={status.incremental.active ? "Active" : status.incremental.dueNow ? "Due now" : "Idle"} tone={incrementalTone} /></DetailRow>
            <DetailRow label="Last sweep">{formatDate(status.incremental.lastSweepCompletedAt)}</DetailRow>
          </dl>
        </Panel>

        <Panel title="Last run" description="ผลล่าสุดจากปุ่มบนหน้านี้หรือ job ที่บันทึกไว้">
          <dl>
            <DetailRow label="Run at">{formatDate(lastResult ? new Date().toISOString() : status.lastRun?.at)}</DetailRow>
            <DetailRow label="Mode">{lastResult?.mode ?? status.lastRun?.mode ?? "-"}</DetailRow>
            <DetailRow label="Dry run">{lastResult?.dryRun ?? status.lastRun?.dryRun ? "Yes" : "No"}</DetailRow>
            <DetailRow label="Books completed">{String(summaryValue(lastSummary, "completedBooks"))}</DetailRow>
            <DetailRow label="Partial books">{String(summaryValue(lastSummary, "partialBooks"))}</DetailRow>
            <DetailRow label="Chapters imported">{String(summaryValue(lastSummary, "importedChapters"))}</DetailRow>
            <DetailRow label="Source chapters">{String(summaryValue(lastSummary, "processedSourceChapters"))}</DetailRow>
            <DetailRow label="Paid chapters">{String(summaryValue(lastSummary, "paidChapters"))}</DetailRow>
            <DetailRow label="Stopped for runtime">{summaryValue(lastSummary, "stoppedForRuntime") ? "Yes" : "No"}</DetailRow>
          </dl>
        </Panel>
      </div>
    </>
  );
}
