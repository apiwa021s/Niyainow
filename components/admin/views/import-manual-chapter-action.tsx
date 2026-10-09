"use client";

import { FilePlus2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";

type ManualChapterResult = {
  action: "created" | "replaced";
  chapterNumber: number;
  lastSuccessfulChapter: number;
  nextProbeChapter: number;
};

function apiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return "เพิ่มตอนไม่สำเร็จ กรุณาลองอีกครั้ง";
  const error = payload.error;
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") {
    return "เพิ่มตอนไม่สำเร็จ กรุณาลองอีกครั้ง";
  }
  return error.message;
}

export function ImportManualChapterAction({
  sourceId,
  nextChapterNumber,
  sourceLanguage,
  defaultSourceUrl,
}: {
  sourceId: string;
  nextChapterNumber: number;
  sourceLanguage: string;
  defaultSourceUrl: string;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [chapterNumber, setChapterNumber] = useState(String(nextChapterNumber));
  const [originalTitle, setOriginalTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState(defaultSourceUrl);
  const [originalText, setOriginalText] = useState("");
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ManualChapterResult | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/imports/${sourceId}/chapters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterNumber: Number(chapterNumber),
          originalTitle,
          sourceUrl,
          originalText,
          replaceExisting,
        }),
      });
      const payload = await response.json().catch(() => null) as {
        chapter?: ManualChapterResult;
        error?: { message?: string };
      } | null;
      if (!response.ok || !payload?.chapter) throw new Error(apiErrorMessage(payload));

      setResult(payload.chapter);
      setChapterNumber(String(payload.chapter.nextProbeChapter));
      setOriginalTitle("");
      setOriginalText("");
      setReplaceExisting(false);
      startTransition(() => router.refresh());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เพิ่มตอนไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-[10rem_minmax(0,1fr)]">
        <Field label="เลขตอน">
          <Input
            type="number"
            min={1}
            max={10_000_000}
            step={1}
            required
            value={chapterNumber}
            onChange={(event) => setChapterNumber(event.target.value)}
          />
        </Field>
        <Field label="ชื่อตอนต้นฉบับ">
          <Input
            required
            maxLength={1_000}
            value={originalTitle}
            onChange={(event) => setOriginalTitle(event.target.value)}
            placeholder="เช่น 第504章 ชื่อตอน"
          />
        </Field>
      </div>

      <Field label="URL ต้นทางของตอน" hint="ใช้สำหรับตรวจสอบย้อนหลัง ต้องเป็น HTTPS">
        <Input
          type="url"
          required
          value={sourceUrl}
          onChange={(event) => setSourceUrl(event.target.value)}
        />
      </Field>

      <Field label={`เนื้อหาต้นฉบับ (${sourceLanguage})`} hint="ระบบจะเก็บใน private staging และนำไปต่อคิวแปลตามขั้นตอนเดิม">
        <Textarea
          required
          maxLength={2_000_000}
          value={originalText}
          onChange={(event) => setOriginalText(event.target.value)}
          className="min-h-72 font-serif"
          placeholder="วางเนื้อหาต้นฉบับของตอนนี้"
        />
      </Field>

      <label className="flex items-start gap-3 rounded-[10px] border border-border bg-muted/40 p-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          checked={replaceExisting}
          onChange={(event) => setReplaceExisting(event.target.checked)}
          className="mt-1 h-4 w-4 accent-[var(--brand-primary)]"
        />
        <span><strong>บันทึกทับตอนเดิม</strong><br /><span className="text-muted-foreground">เลือกเฉพาะเมื่อต้องการแทนที่ต้นฉบับใน staging ตอนที่เผยแพร่แล้วจะไม่สามารถทับจากหน้านี้ได้</span></span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          loading={submitting || refreshing}
          disabled={!chapterNumber || !originalTitle.trim() || !sourceUrl.trim() || !originalText.trim()}
        >
          <FilePlus2 className="h-4 w-4" aria-hidden />
          เพิ่มตอนเข้า staging
        </Button>
        <span className="text-xs text-muted-foreground">ตอนแนะนำถัดไป: {nextChapterNumber.toLocaleString("th-TH")}</span>
      </div>

      <div aria-live="polite">
        {result ? (
          <p className="rounded-[10px] bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300">
            {result.action === "created" ? "เพิ่ม" : "อัปเดต"}ตอน {result.chapterNumber.toLocaleString("th-TH")} แล้ว · checkpoint ถึงตอน {result.lastSuccessfulChapter.toLocaleString("th-TH")} · ตอนถัดไป {result.nextProbeChapter.toLocaleString("th-TH")}
          </p>
        ) : null}
        {error ? <p className="rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
      </div>
    </form>
  );
}
