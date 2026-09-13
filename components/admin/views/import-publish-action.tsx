"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

type PublishResult = {
  novelSlug: string;
  readyChapters: number;
  processedChapters: number;
  remainingChapters: number;
  createdChapters: number;
  publishedChapters: number;
};

export function ImportPublishAction({
  sourceId,
  canPublish,
  readyChapterCount,
  linkedChapterCount,
  novelSlug,
  reason,
}: {
  sourceId: string;
  canPublish: boolean;
  readyChapterCount: number;
  linkedChapterCount: number;
  novelSlug: string | null;
  reason: string | null;
}) {
  const router = useRouter();
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PublishResult | null>(null);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const publicSlug = result?.novelSlug ?? novelSlug;

  async function publish() {
    setSubmitting(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      let previousRemaining = Number.POSITIVE_INFINITY;
      let totalCreated = 0;
      let totalPublished = 0;
      let finalResult: PublishResult | null = null;
      while (!finalResult || finalResult.remainingChapters > 0) {
        const response = await fetch(`/api/admin/imports/${sourceId}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rightsConfirmed: true }),
        });
        const payload = await response.json().catch(() => null) as {
          publication?: PublishResult;
          error?: { message?: string };
        } | null;
        if (!response.ok || !payload?.publication) {
          throw new Error(payload?.error?.message || "เผยแพร่ไม่สำเร็จ กรุณากดอีกครั้งเพื่อทำต่อจากจุดเดิม");
        }
        const batch = payload.publication;
        totalCreated += batch.createdChapters;
        totalPublished += batch.publishedChapters;
        setProgress({
          processed: Math.max(0, batch.readyChapters - batch.remainingChapters),
          total: batch.readyChapters,
        });
        if (batch.remainingChapters > 0 && batch.remainingChapters >= previousRemaining) {
          throw new Error("จำนวนตอนคงเหลือไม่ลดลง กรุณากดอีกครั้งเพื่อทำต่อจากจุดเดิม");
        }
        previousRemaining = batch.remainingChapters;
        finalResult = {
          ...batch,
          createdChapters: totalCreated,
          publishedChapters: totalPublished,
        };
      }
      setResult(finalResult);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เผยแพร่ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        <p><strong className="text-foreground">{readyChapterCount.toLocaleString("th-TH")}</strong> ตอนพร้อมเผยแพร่ตาม checkpoint</p>
        <p><strong className="text-foreground">{linkedChapterCount.toLocaleString("th-TH")}</strong> ตอนเชื่อมกับ catalog แล้ว</p>
      </div>

      {canPublish ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-[10px] border border-border bg-muted/40 p-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={rightsConfirmed}
            onChange={(event) => setRightsConfirmed(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--brand-primary)]"
          />
          <span>ยืนยันว่ามีสิทธิ์เผยแพร่เนื้อหาจากแหล่งนี้ และเนื้อหาผ่านนโยบายของเว็บไซต์แล้ว</span>
        </label>
      ) : (
        <p className="rounded-[10px] bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">{reason}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={publish}
          disabled={!canPublish || !rightsConfirmed}
          loading={submitting || refreshing}
        >
          <Send className="h-4 w-4" aria-hidden />
          {novelSlug ? "ซิงก์และเผยแพร่ตอนที่พร้อม" : "สร้างเรื่องและเผยแพร่ทันที"}
        </Button>
        {publicSlug ? (
          <Link
            href={`/novel/${publicSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-[6px] border border-border px-4 text-sm font-semibold hover:bg-muted"
          >
            เปิดหน้าสาธารณะ <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div aria-live="polite">
        {submitting && progress ? (
          <p className="mb-2 text-sm text-muted-foreground">กำลังเผยแพร่ {progress.processed.toLocaleString("th-TH")} / {progress.total.toLocaleString("th-TH")} ตอน…</p>
        ) : null}
        {result ? (
          <p className="flex items-start gap-2 rounded-[10px] bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            พร้อมอ่าน {result.readyChapters.toLocaleString("th-TH")} ตอน — สร้างใหม่ {result.createdChapters.toLocaleString("th-TH")} ตอน และเผยแพร่เพิ่ม {result.publishedChapters.toLocaleString("th-TH")} ตอน
          </p>
        ) : null}
        {error ? <p className="rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}
