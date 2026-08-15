"use client";

import { CheckCircle2, Clipboard, FileImage, LoaderCircle, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { assetUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";

export type AdminAssetType = "cover" | "banner";

export async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string; fields?: Record<string, string[]> } } | null;
  const fieldMessage = body?.error?.fields ? Object.values(body.error.fields).flat()[0] : undefined;
  return fieldMessage || body?.error?.message || `Request failed (${response.status})`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * Presign → PUT to R2 → complete. The object key is only handed to the parent
 * form once the upload is verified, so a form can never submit an unattached key.
 */
export function AssetUpload({
  assetType,
  value,
  onChange,
  title: titleOverride,
  description: descriptionOverride,
}: {
  assetType: AdminAssetType;
  value: string;
  onChange: (value: string) => void;
  title?: string;
  description?: string;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileMeta, setFileMeta] = useState("");
  const [copied, setCopied] = useState(false);
  const isCover = assetType === "cover";
  const title = titleOverride ?? (isCover ? "ภาพปก" : "ภาพแบนเนอร์");
  const description = descriptionOverride ?? (isCover ? "แนะนำ 900 x 1200px สำหรับการ์ดนิยาย" : "แนะนำ 1600 x 600px สำหรับหัวเรื่อง");
  const currentPreview = previewUrl || (value ? assetUrl(value) : "");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function upload(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFileMeta(`${file.name} · ${formatFileSize(file.size)}`);
    setBusy(true);
    setMessage("");
    setCopied(false);
    try {
      const authorization = await fetch("/api/admin/uploads/presign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assetType, originalFileName: file.name, contentType: file.type, contentLength: file.size }),
      });
      if (!authorization.ok) throw new Error(await responseMessage(authorization));
      const signed = await authorization.json() as { objectKey: string; uploadUrl: string; requiredHeaders: Record<string, string> };
      const uploaded = await fetch(signed.uploadUrl, { method: "PUT", headers: signed.requiredHeaders, body: file });
      if (!uploaded.ok) throw new Error(`R2 upload failed (${uploaded.status})`);
      const completed = await fetch("/api/admin/uploads/complete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ objectKey: signed.objectKey, contentType: file.type, contentLength: file.size }),
      });
      if (!completed.ok) throw new Error(await responseMessage(completed));
      onChange(signed.objectKey);
      setMessage("อัปโหลดและตรวจสอบไฟล์แล้ว");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setMessage("คัดลอก object key ไม่สำเร็จ");
    }
  }

  function clearAsset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setFileMeta("");
    setMessage("");
    setCopied(false);
    onChange("");
  }

  return (
    <div className="overflow-hidden rounded-[14px] border border-border bg-muted/35">
      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void upload(file);
        }}
      />
      <label
        htmlFor={inputId}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          const file = event.dataTransfer.files?.[0];
          if (file && !busy) void upload(file);
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col overflow-hidden border-b border-border bg-card transition hover:border-[var(--brand-light)]",
          isCover ? "aspect-[3/4]" : "aspect-[16/7]",
          busy && "pointer-events-none opacity-80"
        )}
      >
        {currentPreview ? (
          <span
            aria-hidden
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${currentPreview}")` }}
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,rgba(109,40,255,.10),rgba(255,110,199,.08))]">
            <span className="grid h-14 w-14 place-items-center rounded-[14px] bg-background/80 text-[var(--brand-emphasis)] ring-1 ring-border">
              <FileImage className="h-6 w-6" />
            </span>
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-gradient-to-t from-black/72 via-black/38 to-transparent p-3 text-white">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{title}</span>
            <span className="block truncate text-xs text-white/75">{fileMeta || description}</span>
          </span>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white/18 backdrop-blur transition group-hover:bg-white/28">
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
          </span>
        </span>
      </label>
      <div className="grid gap-3 p-3">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[8px] bg-background px-2.5 py-2 text-xs ring-1 ring-border">
            {value || "ยังไม่มีไฟล์"}
          </code>
          <button
            type="button"
            onClick={() => void copyKey()}
            disabled={!value}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="คัดลอก object key"
          >
            {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={clearAsset}
            disabled={!value && !previewUrl}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[9px] border border-border bg-card text-muted-foreground transition hover:text-destructive disabled:cursor-not-allowed disabled:opacity-45"
            aria-label="นำไฟล์ออก"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className={cn("text-xs leading-relaxed", message && !message.includes("แล้ว") ? "text-destructive" : "text-muted-foreground")}>
          {busy ? "กำลังอัปโหลดและตรวจสอบไฟล์..." : message || "ลากไฟล์มาวาง หรือคลิกเพื่อเลือก JPEG, PNG, WebP, AVIF"}
        </p>
      </div>
    </div>
  );
}
