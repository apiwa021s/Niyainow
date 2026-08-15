"use client";

import { AlertCircle, CheckCircle2, Coins, Database, Play, RefreshCw, Search, Square, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AdminPageHeader, DetailRow, Panel, StatCard } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import {
  isRetryableMongoSyncFailure,
  mergeMongoSyncSummaries,
  mongoSyncCursorFingerprint,
  shouldContinueMongoAutoSync,
  type MongoSyncSummary,
} from "@/lib/domain/mongo-sync";

type SyncSummary = MongoSyncSummary;

type SyncStatus = {
  backfill: {
    completed: boolean;
    completedAt: string | null;
    highWaterBookId?: string | null;
    afterBookId: string | null;
    currentBookId: string | null;
    chapterOffset: number;
  };
  incremental: {
    active: boolean;
    lastSweepCompletedAt: string | null;
    nextDueAt: string | null;
    dueNow: boolean;
    afterUpdatedAt: string | null;
    afterBookId: string | null;
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
  job?: {
    running: boolean;
    leaseExpiresAt: string | null;
    retryAfterSeconds?: number | null;
  };
};

type ApiPayload = {
  status: SyncStatus;
  result?: SyncSummary;
  error?: { code?: string; message?: string };
};

class SyncRequestError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly code?: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "SyncRequestError";
  }
}

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

function successMessage(result: SyncSummary | undefined) {
  if (!result) return "คำสั่ง sync จบแล้ว";
  if (result.dryRun) return "Dry run เสร็จแล้ว ยังไม่ได้บันทึกข้อมูลจริง";
  if (result.backfillComplete) return "Sync ทั้งหมดครบแล้ว";
  if (result.mode === "incremental" && !result.incrementalDue && result.selectedBooks === 0) {
    return "ข้อมูลเป็นปัจจุบันแล้ว ยังไม่มี incremental sync ที่ถึงกำหนด";
  }
  if (result.stoppedForRuntime) {
    return `Sync batch นี้หยุดตามเวลาที่กำหนด: ${formatNumber(result.completedBooks)} เรื่อง, ${formatNumber(result.importedChapters)} ตอน`;
  }
  return `Sync batch นี้จบแล้ว: ${formatNumber(result.completedBooks)} เรื่อง, ${formatNumber(result.importedChapters)} ตอน`;
}

async function readPayload(response: Response) {
  const payload = (await response.json().catch(() => ({}))) as ApiPayload;
  if (response.ok) return payload;

  const retryAfter = Number(response.headers.get("Retry-After"));
  throw new SyncRequestError(
    payload.error?.message || "สั่ง sync ไม่สำเร็จ",
    response.status,
    payload.error?.code,
    Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1_000 : undefined,
  );
}

async function requestStatus(signal?: AbortSignal) {
  const response = await fetch("/api/admin/sync/mongo-translated-novels", {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal,
  });
  const payload = await readPayload(response);
  if (!payload.status) throw new SyncRequestError("โหลดสถานะไม่สำเร็จ");
  return payload.status;
}

async function runCommand(command: keyof typeof commandConfig, signal?: AbortSignal) {
  const response = await fetch("/api/admin/sync/mongo-translated-novels", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(commandConfig[command]),
    cache: "no-store",
    signal,
  });
  const payload = await readPayload(response);
  if (!payload.status) throw new SyncRequestError("เซิร์ฟเวอร์ไม่ส่งสถานะ sync กลับมา");
  return payload;
}

function retryDelay(attempt: number, serverDelay?: number) {
  if (serverDelay) return Math.min(serverDelay, 120_000);
  const exponential = Math.min(30_000, 2_000 * (2 ** attempt));
  return exponential + Math.round(Math.random() * 750);
}

async function waitForRetry(ms: number, shouldStop: () => boolean) {
  let remaining = ms;
  while (remaining > 0 && !shouldStop()) {
    const step = Math.min(500, remaining);
    await new Promise((resolve) => setTimeout(resolve, step));
    remaining -= step;
  }
}

export function MongoSyncView({ initialStatus }: { initialStatus: SyncStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [lastResult, setLastResult] = useState<SyncSummary | null>(null);
  const [busy, setBusy] = useState<keyof typeof commandConfig | "refresh" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const operationRef = useRef<string | null>(null);
  const stopRequestedRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopRequestedRef.current = true;
      requestControllerRef.current?.abort();
    };
  }, []);

  const progress = useMemo(() => {
    if (!status.mongo.configured || status.mongo.targetBooks === 0) return 0;
    return Math.min(100, Math.round(((status.mongo.backfillProcessedBooks ?? 0) / status.mongo.targetBooks) * 100));
  }, [status.mongo]);

  const lastSummary = lastResult ?? status.lastRun?.summary ?? null;
  const currentBookLabel = status.backfill.currentBookId
    ?? (status.mongo.configured && status.mongo.nextBackfillBook ? status.mongo.nextBackfillBook.bookName : "-");

  const refresh = async () => {
    if (operationRef.current) return;
    operationRef.current = "refresh";
    setBusy("refresh");
    setMessage(null);
    setMessageIsError(false);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      setStatus(await requestStatus(controller.signal));
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "โหลดสถานะไม่สำเร็จ");
    } finally {
      operationRef.current = null;
      requestControllerRef.current = null;
      if (mountedRef.current) setBusy(null);
    }
  };

  const executeOnce = async (command: "dryRun") => {
    if (operationRef.current) return;
    operationRef.current = command;
    setBusy(command);
    setMessage(null);
    setMessageIsError(false);
    const controller = new AbortController();
    requestControllerRef.current = controller;
    try {
      const payload = await runCommand(command, controller.signal);
      setStatus(payload.status);
      setLastResult(payload.result ?? null);
      setMessage(successMessage(payload.result));
    } catch (error) {
      setMessageIsError(true);
      setMessage(error instanceof Error ? error.message : "สั่ง sync ไม่สำเร็จ");
    } finally {
      operationRef.current = null;
      requestControllerRef.current = null;
      if (mountedRef.current) setBusy(null);
    }
  };

  const executeContinuous = async (command: "auto" | "incremental") => {
    if (operationRef.current) return;
    operationRef.current = command;
    stopRequestedRef.current = false;
    setBusy(command);
    setMessageIsError(false);
    setMessage(
      command === "auto"
        ? "กำลังเริ่ม Auto sync — กรุณาเปิดหน้านี้ไว้ ระบบจะทำต่อทีละ batch"
        : "กำลัง sync ตอนใหม่ — ระบบจะทำต่อทีละ batch จน sweep นี้ครบ",
    );

    const controller = new AbortController();
    requestControllerRef.current = controller;
    let accumulated: SyncSummary | null = null;
    let previousCursor = mongoSyncCursorFingerprint(status);
    let unchangedCursorCount = 0;
    let completedBatches = 0;

    try {
      while (!stopRequestedRef.current) {
        let payload: ApiPayload | null = null;

        for (let attempt = 0; attempt < 12 && !stopRequestedRef.current; attempt += 1) {
          try {
            payload = await runCommand(command, controller.signal);
            break;
          } catch (error) {
            const requestError = error instanceof SyncRequestError ? error : null;
            const isTransientNetworkError = error instanceof TypeError;
            const maxAttempts = requestError?.code === "SYNC_ALREADY_RUNNING" ? 12 : 5;
            if (
              error instanceof DOMException && error.name === "AbortError"
              || (!isTransientNetworkError && !isRetryableMongoSyncFailure(requestError?.status, requestError?.code))
              || attempt === maxAttempts - 1
            ) {
              throw error;
            }

            const delay = retryDelay(attempt, requestError?.retryAfterMs);
            if (mountedRef.current) {
              setMessageIsError(false);
              setMessage(`มี worker อื่นหรือการเชื่อมต่อสะดุด กำลังลองใหม่ใน ${Math.ceil(delay / 1_000)} วินาที (ครั้งที่ ${attempt + 1}/${maxAttempts})`);
            }
            await waitForRetry(delay, () => stopRequestedRef.current);
          }
        }

        if (!payload && stopRequestedRef.current) break;
        if (!payload?.result) throw new SyncRequestError("เซิร์ฟเวอร์ไม่ส่งผลลัพธ์ sync กลับมา");

        completedBatches += 1;
        accumulated = mergeMongoSyncSummaries(accumulated, payload.result);
        const nextCursor = mongoSyncCursorFingerprint(payload.status);
        const shouldContinue = shouldContinueMongoAutoSync(payload.status, payload.result);
        unchangedCursorCount = shouldContinue && nextCursor === previousCursor ? unchangedCursorCount + 1 : 0;
        previousCursor = nextCursor;

        if (mountedRef.current) {
          setStatus(payload.status);
          setLastResult(accumulated);
          setMessageIsError(false);
          setMessage(
            shouldContinue
              ? `Sync ทำต่ออัตโนมัติ: ${formatNumber(accumulated.completedBooks)} เรื่อง, ${formatNumber(accumulated.importedChapters)} ตอน (${completedBatches} batches)`
              : successMessage(accumulated),
          );
        }

        if (!shouldContinue || stopRequestedRef.current) break;
        if (unchangedCursorCount >= 3) {
          throw new SyncRequestError("Sync หยุดเพื่อความปลอดภัย เพราะ cursor ไม่ขยับติดต่อกัน 3 batches กรุณาตรวจสอบข้อมูลต้นทางแล้วกด sync เพื่อทำต่อ");
        }
      }

      if (stopRequestedRef.current && mountedRef.current) {
        setMessageIsError(false);
        setMessage("หยุด sync แล้ว ระบบบันทึก cursor ล่าสุดไว้ กด sync อีกครั้งเพื่อทำต่อได้");
      }
    } catch (error) {
      if (mountedRef.current && !(error instanceof DOMException && error.name === "AbortError")) {
        setMessageIsError(true);
        setMessage(error instanceof Error ? error.message : "Sync ไม่สำเร็จ");
      }
    } finally {
      operationRef.current = null;
      requestControllerRef.current = null;
      if (mountedRef.current) setBusy(null);
    }
  };

  const stopContinuous = () => {
    stopRequestedRef.current = true;
    setMessageIsError(false);
    setMessage("กำลังหยุดหลัง batch ปัจจุบัน เพื่อบันทึก cursor ให้เรียบร้อย…");
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
            <Button type="button" variant="outline" onClick={refresh} loading={busy === "refresh"} disabled={busy !== null}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button type="button" variant="outline" onClick={() => executeOnce("dryRun")} loading={busy === "dryRun"} disabled={busy !== null}>
              <Search className="h-4 w-4" />
              Dry run
            </Button>
            {busy === "auto" ? (
              <Button type="button" onClick={stopContinuous}>
                <Square className="h-4 w-4" />
                หยุดหลัง batch นี้
              </Button>
            ) : (
              <Button type="button" onClick={() => executeContinuous("auto")} disabled={busy !== null}>
                <Play className="h-4 w-4" />
                Auto sync
              </Button>
            )}
          </>
        }
      />

      {message ? (
        <div className="mb-4 flex items-center gap-2 rounded-[12px] border border-border bg-card px-4 py-3 text-sm">
          {messageIsError ? <AlertCircle className="h-4 w-4 text-destructive" /> : <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
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
          description="Auto sync จะรันต่อทีละ 1 เรื่อง และบันทึก cursor ทุก chunk ละ 100 ตอน จน initial sync ครบ"
          action={
            busy === "incremental" ? (
              <Button type="button" variant="secondary" onClick={stopContinuous}>
                <Square className="h-4 w-4" />
                หยุดหลัง batch นี้
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => executeContinuous("incremental")}
                disabled={busy !== null || !status.backfill.completed}
                title={!status.backfill.completed ? "ทำ initial sync ให้ครบก่อน" : undefined}
              >
                <RefreshCw className="h-4 w-4" />
                Sync new chapters
              </Button>
            )
          }
        >
          <div className="mb-5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium">Backfill progress</span>
              <span className="tabular text-muted-foreground">{progress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-[var(--brand-primary)]" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <dl>
            <DetailRow label="Backfill status"><StatusPill label={status.backfill.completed ? "Complete" : status.backfill.currentBookId ? "Chunking" : "Running"} tone={backfillTone} /></DetailRow>
            <DetailRow label="Processed books">{status.mongo.configured ? `${formatNumber(status.mongo.backfillProcessedBooks)} / ${formatNumber(status.mongo.targetBooks)}` : "Mongo unavailable"}</DetailRow>
            <DetailRow label="Current book">{currentBookLabel}</DetailRow>
            <DetailRow label="Chapter offset">{formatNumber(status.backfill.chapterOffset)}</DetailRow>
            <DetailRow label="After bookId">{status.backfill.afterBookId ?? "-"}</DetailRow>
            <DetailRow label="Initial snapshot">{status.backfill.highWaterBookId ?? "-"}</DetailRow>
            <DetailRow label="Worker"><StatusPill label={status.job?.running ? "Running" : "Idle"} tone={status.job?.running ? "warning" : "neutral"} /></DetailRow>
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
