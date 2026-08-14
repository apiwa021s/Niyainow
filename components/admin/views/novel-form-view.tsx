"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, Clipboard, FileImage, LoaderCircle, Save, Trash2, Upload, UploadCloud, X } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { assetUrl } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import type { AdminNovelDetail, AdminReferenceData } from "@/services/admin-service";

function splitNames(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

async function responseMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string; fields?: Record<string, string[]> } } | null;
  const fieldMessage = body?.error?.fields ? Object.values(body.error.fields).flat()[0] : undefined;
  return fieldMessage || body?.error?.message || `Request failed (${response.status})`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function AssetUpload({
  assetType,
  value,
  onChange,
}: {
  assetType: "cover" | "banner";
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [fileMeta, setFileMeta] = useState("");
  const [copied, setCopied] = useState(false);
  const isCover = assetType === "cover";
  const title = isCover ? "ภาพปก" : "ภาพแบนเนอร์";
  const description = isCover ? "แนะนำ 900 x 1200px สำหรับการ์ดนิยาย" : "แนะนำ 1600 x 600px สำหรับหัวเรื่อง";
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
            <span className="grid h-14 w-14 place-items-center rounded-[14px] bg-background/80 text-[var(--brand-primary)] ring-1 ring-border">
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

export function LegacyAssetUpload({
  assetType,
  value,
  onChange,
}: {
  assetType: "cover" | "banner";
  value: string;
  onChange: (value: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setMessage("");
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

  return (
    <div className="grid gap-2">
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={busy}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) void upload(file);
        }}
      />
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[8px] bg-muted px-2 py-1.5 text-xs">{value || "ยังไม่มีไฟล์"}</code>
        {value ? <button type="button" onClick={() => onChange("")} className="text-xs font-semibold text-destructive hover:underline">นำออก</button> : null}
      </div>
      <p className="text-xs text-muted-foreground">{busy ? "กำลังอัปโหลด…" : message || "รองรับ JPEG, PNG, WebP และ AVIF"}</p>
    </div>
  );
}

export function NovelFormView({ novel, references }: { novel?: AdminNovelDetail; references: AdminReferenceData }) {
  const router = useRouter();
  const [coverKey, setCoverKey] = useState(novel?.coverKey ?? "");
  const [bannerKey, setBannerKey] = useState(novel?.bannerKey ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const publicationStatus = String(form.get("publicationStatus"));
    const scheduledRaw = String(form.get("scheduledFor") ?? "");
    const payload = {
      title: String(form.get("title") ?? ""),
      titleOriginal: String(form.get("titleOriginal") ?? ""),
      ...(novel ? {} : { slug: String(form.get("slug") ?? "") || undefined }),
      synopsis: String(form.get("synopsis") ?? ""),
      authorNames: splitNames(form.get("authors")),
      genreIds: form.getAll("genreIds").map(String),
      tagNames: splitNames(form.get("tags")),
      status: String(form.get("status")),
      publicationStatus,
      contentRating: String(form.get("contentRating")),
      isFeatured: form.get("isFeatured") === "on",
      coverKey: coverKey || null,
      bannerKey: bannerKey || null,
      scheduledFor: publicationStatus === "SCHEDULED" && scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
    };
    try {
      const response = await fetch(novel ? `/api/admin/novels/${novel.slug}` : "/api/admin/novels", {
        method: novel ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json() as { novel: { slug: string } };
      router.push(`/admin/novels/${body.novel.slug}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!novel || !window.confirm(`ยืนยันการเก็บ ${novel.title} ออกจากระบบ? การดำเนินการนี้เป็น soft delete`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/novels/${novel.slug}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseMessage(response));
      router.push("/admin/novels");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถลบนิยายได้");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid content-start gap-4">
        <Panel title="ข้อมูลเรื่อง" description={novel ? `slug คงที่: ${novel.slug}` : "ระบบจะสร้าง slug ที่ไม่ซ้ำและคงที่เมื่อบันทึกครั้งแรก"}>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ชื่อเรื่อง"><Input name="title" required minLength={2} defaultValue={novel?.title ?? ""} /></Field>
              <Field label="ชื่อเรื่องต้นฉบับ"><Input name="titleOriginal" defaultValue={novel?.titleOriginal ?? ""} /></Field>
            </div>
            {!novel ? <Field label="Slug (เว้นว่างเพื่อสร้างอัตโนมัติ)"><Input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></Field> : null}
            <Field label="เรื่องย่อ"><Textarea name="synopsis" required minLength={20} className="min-h-52" defaultValue={novel?.synopsis ?? ""} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ผู้แต่ง (คั่นด้วยจุลภาค)"><Input name="authors" required defaultValue={novel?.authors.join(", ") ?? ""} /></Field>
              <Field label="แท็ก (คั่นด้วยจุลภาค)" hint="แท็กใหม่จะถูกสร้างอย่างมี slug ที่ไม่ซ้ำ"><Input name="tags" defaultValue={novel?.tags.map((tag) => tag.name).join(", ") ?? ""} /></Field>
            </div>
            <Field label="แนวนิยาย" hint="กด Ctrl/Cmd เพื่อเลือกหลายแนว">
              <Select name="genreIds" multiple required defaultValue={novel?.genres.map((genre) => genre.id) ?? []} className="h-44 py-2">
                {references.genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
              </Select>
            </Field>
          </div>
        </Panel>

        <Panel title="ไฟล์ภาพบน R2" description="ระบบเก็บเฉพาะ object key และตรวจสอบไฟล์ใน R2 ก่อนนำไปใช้">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="ภาพปก"><AssetUpload assetType="cover" value={coverKey} onChange={setCoverKey} /></Field>
            <Field label="ภาพแบนเนอร์"><AssetUpload assetType="banner" value={bannerKey} onChange={setBannerKey} /></Field>
          </div>
        </Panel>
      </div>

      <div className="grid content-start gap-4">
        <Panel title="สถานะและการเผยแพร่">
          <div className="grid gap-4">
            <label className="grid gap-1.5"><Label>สถานะเนื้อเรื่อง</Label><Select name="status" defaultValue={novel?.status ?? "ONGOING"}>
              <option value="ONGOING">กำลังดำเนินเรื่อง</option><option value="COMPLETED">จบแล้ว</option><option value="HIATUS">พักการเขียน</option><option value="CANCELLED">ยุติ</option>
            </Select></label>
            <label className="grid gap-1.5"><Label>สถานะเผยแพร่</Label><Select name="publicationStatus" defaultValue={novel?.publicationStatus === "SCHEDULED" ? "DRAFT" : novel?.publicationStatus ?? "DRAFT"}>
              <option value="DRAFT">ฉบับร่าง</option><option value="IN_REVIEW">รอตรวจ</option><option value="PUBLISHED">เผยแพร่</option><option value="ARCHIVED">เก็บถาวร</option>
            </Select></label>
            <div className="rounded-[12px] border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">การตั้งเวลาเผยแพร่ปิดไว้จนกว่าจะติดตั้ง production scheduler/cron ที่ตรวจสอบและ retry ได้จริง</div>
            <label className="grid gap-1.5"><Label>ระดับเนื้อหา</Label><Select name="contentRating" defaultValue={novel?.contentRating ?? "TEEN"}>
              <option value="EVERYONE">ทุกวัย</option><option value="TEEN">วัยรุ่น</option><option value="MATURE">ผู้ใหญ่</option><option value="ADULT">18+</option>
            </Select></label>
            <label className="flex items-center gap-2 rounded-[12px] border border-border p-3 text-sm font-medium">
              <input type="checkbox" name="isFeatured" defaultChecked={novel?.isFeatured ?? false} className="h-4 w-4 accent-[var(--brand-primary)]" /> แสดงเป็นเรื่องแนะนำ
            </label>
            {message ? <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}
            <Button type="submit" loading={busy}><Save className="h-4 w-4" />บันทึกข้อมูล</Button>
            <ButtonLink href="/admin/novels" variant="outline">กลับหน้ารายการ</ButtonLink>
            {novel ? <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()} className="text-destructive"><Trash2 className="h-4 w-4" />ลบนิยาย (ADMIN)</Button> : null}
          </div>
        </Panel>
        <Panel title="การอัปโหลด">
          <p className="flex gap-2 text-xs leading-relaxed text-muted-foreground"><Upload className="mt-0.5 h-4 w-4 shrink-0" />Presigned URL มีอายุสั้น และเบราว์เซอร์ต้องเข้าถึง R2 ผ่าน CORS ที่กำหนดไว้ในคู่มือ deployment</p>
        </Panel>
      </div>
    </form>
  );
}
