"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  FileImage,
  ImageUp,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { responseMessage } from "@/lib/http/client-response";
import { assetUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type AdminAssetType = "cover" | "banner";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES: Record<AdminAssetType, number> = {
  cover: 8 * 1024 * 1024,
  banner: 12 * 1024 * 1024,
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function friendlyUploadError(error: unknown) {
  if (!(error instanceof Error)) return "อัปโหลดภาพไม่สำเร็จ กรุณาลองอีกครั้ง";
  if (error.message === "Failed to fetch" || error instanceof TypeError) {
    return "เชื่อมต่อพื้นที่เก็บภาพไม่ได้ กรุณาลองอีกครั้งหรือติดต่อผู้ดูแลระบบ";
  }
  if (/Request failed \(413\)/u.test(error.message)) {
    return "ไฟล์ใหญ่เกินขนาดที่เซิร์ฟเวอร์สำรองรับได้ กรุณาลดขนาดภาพแล้วลองอีกครั้ง";
  }
  return error.message;
}

async function putWithSameOriginFallback(
  signed: { objectKey: string; uploadUrl: string; requiredHeaders: Record<string, string> },
  file: File,
) {
  try {
    const uploaded = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: signed.requiredHeaders,
      body: file,
    });
    if (uploaded.ok) return;
  } catch {
    // A missing/stale bucket CORS policy rejects the browser request before it
    // receives a response. The authenticated same-origin route below is the
    // bounded fallback; the presigned URL remains the normal fast path.
  }

  const fallback = await fetch(`/api/admin/uploads/proxy?objectKey=${encodeURIComponent(signed.objectKey)}`, {
    method: "POST",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!fallback.ok) throw new Error(await responseMessage(fallback));
}

/** Presign → PUT to R2 (or same-origin fallback) → verify and promote. */
export function AssetUpload({
  assetType,
  value,
  onChange,
  onBusyChange,
  title: titleOverride,
  description: descriptionOverride,
  className,
}: {
  assetType: AdminAssetType;
  value: string;
  onChange: (value: string) => void;
  onBusyChange?: (busy: boolean) => void;
  title?: string;
  description?: string;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileMeta, setFileMeta] = useState("");
  const [copied, setCopied] = useState(false);
  const isCover = assetType === "cover";
  const title = titleOverride ?? (isCover ? "ภาพปก" : "ภาพแบนเนอร์");
  const description = descriptionOverride ?? (isCover ? "แนะนำ 900 × 1200 พิกเซล" : "แนะนำ 1600 × 600 พิกเซล");
  const currentPreview = previewUrl || (value ? assetUrl(value) : "");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function upload(file: File) {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setStatus("error");
      setMessage("รองรับเฉพาะไฟล์ JPG, PNG, WebP และ AVIF");
      return;
    }
    if (file.size > MAX_BYTES[assetType]) {
      setStatus("error");
      setMessage(`ไฟล์ต้องมีขนาดไม่เกิน ${MAX_BYTES[assetType] / 1024 / 1024} MB`);
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl(nextPreview);
    setFileMeta(`${file.name} · ${formatFileSize(file.size)}`);
    setBusy(true);
    onBusyChange?.(true);
    setStatus("idle");
    setMessage("");
    setCopied(false);

    try {
      const authorization = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assetType,
          originalFileName: file.name,
          contentType: file.type,
          contentLength: file.size,
        }),
      });
      if (!authorization.ok) throw new Error(await responseMessage(authorization));
      const signed = await authorization.json() as {
        objectKey: string;
        uploadUrl: string;
        requiredHeaders: Record<string, string>;
      };

      await putWithSameOriginFallback(signed, file);

      const completed = await fetch("/api/admin/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          objectKey: signed.objectKey,
          contentType: file.type,
          contentLength: file.size,
        }),
      });
      if (!completed.ok) throw new Error(await responseMessage(completed));
      const result = await completed.json() as { media?: { objectKey?: string } };
      onChange(result.media?.objectKey || signed.objectKey);
      setStatus("success");
      setMessage("อัปโหลดภาพสำเร็จ — กดบันทึกเพื่อใช้ภาพนี้กับนิยาย");
    } catch (error) {
      URL.revokeObjectURL(nextPreview);
      setPreviewUrl("");
      setFileMeta("");
      setStatus("error");
      setMessage(friendlyUploadError(error));
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  async function copyKey() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setStatus("error");
      setMessage("คัดลอกข้อมูลไฟล์ไม่สำเร็จ");
    }
  }

  function clearAsset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFileMeta("");
    setMessage("นำภาพออกแล้ว — กดบันทึกเพื่อยืนยันการเปลี่ยนแปลง");
    setStatus("idle");
    setCopied(false);
    onChange("");
  }

  return (
    <section className={cn("overflow-hidden rounded-[14px] border border-border bg-card", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        aria-label={`เลือกไฟล์${title}`}
        aria-describedby={`${inputId}-status`}
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file && !busy) void upload(file);
        }}
        className={cn(
          "relative overflow-hidden border-b border-border bg-muted/45",
          isCover ? "aspect-[3/4]" : "aspect-[16/6]",
        )}
      >
        {currentPreview ? (
          // Existing CDN images and local blob previews do not benefit from
          // next/image in this interactive admin-only picker.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={currentPreview} alt={`ตัวอย่าง${title}`} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,rgba(109,40,255,.10),rgba(255,110,199,.08))]">
            <span className="grid h-14 w-14 place-items-center rounded-[14px] bg-background/85 text-[var(--brand-emphasis)] ring-1 ring-border">
              <FileImage className="h-6 w-6" aria-hidden />
            </span>
          </div>
        )}
        {busy ? (
          <div className="absolute inset-0 grid place-items-center bg-black/55 text-white backdrop-blur-[2px]">
            <span className="flex items-center gap-2 rounded-full bg-black/45 px-4 py-2 text-sm font-semibold">
              <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
              กำลังอัปโหลด…
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold">{title}</h3>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{fileMeta || description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
              <ImageUp className="h-4 w-4" aria-hidden />
              {value || previewUrl ? "เปลี่ยนภาพ" : "เลือกภาพ"}
            </Button>
            {value || previewUrl ? (
              <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={clearAsset} className="text-destructive">
                <Trash2 className="h-4 w-4" aria-hidden />
                เอาออก
              </Button>
            ) : null}
          </div>
        </div>

        <p
          id={`${inputId}-status`}
          role={status === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start gap-2 rounded-[10px] px-3 py-2 text-xs leading-relaxed",
            status === "error" && "bg-destructive/10 text-destructive",
            status === "success" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            status === "idle" && "bg-muted/70 text-muted-foreground",
          )}
        >
          {status === "error" ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
          {status === "success" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : null}
          <span>{message || `ลากไฟล์มาวางหรือกดเลือกภาพ · สูงสุด ${MAX_BYTES[assetType] / 1024 / 1024} MB`}</span>
        </p>

        {value ? (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none font-medium hover:text-foreground">ข้อมูลไฟล์สำหรับผู้ดูแล</summary>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-[8px] bg-muted px-2.5 py-2">{value}</code>
              <button
                type="button"
                onClick={() => void copyKey()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card transition hover:text-foreground"
                aria-label="คัดลอก object key"
              >
                {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />}
              </button>
            </div>
          </details>
        ) : null}
      </div>
    </section>
  );
}
