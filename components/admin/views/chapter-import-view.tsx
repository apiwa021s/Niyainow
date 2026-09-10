"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FilePlus2, FileText, GripVertical, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { parseChapterLabel, parseCombinedChapters } from "@/lib/admin/chapter-import";
import { assetUrl, publicAssetFallbacks } from "@/lib/site-config";

type ImportRow = {
  id: string;
  chapterNumber: number;
  sortOrder: number;
  title: string;
  content: string;
  source: string;
};

function apiErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("error" in payload)) return "นำเข้าตอนไม่สำเร็จ กรุณาลองอีกครั้ง";
  const error = payload.error;
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") {
    return "นำเข้าตอนไม่สำเร็จ กรุณาลองอีกครั้ง";
  }
  return error.message;
}

function rowId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function ChapterImportView({
  novel,
  defaults,
}: {
  novel: { slug: string; title: string; coverKey: string | null };
  defaults: { chapterNumber: number; sortOrder: number };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [combinedText, setCombinedText] = useState("");
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function appendRows(items: Array<Omit<ImportRow, "id" | "sortOrder">>) {
    const room = Math.max(0, 50 - rows.length);
    const accepted = items.slice(0, room).map((item, index) => ({
      ...item,
      id: rowId(),
      sortOrder: defaults.sortOrder + rows.length + index,
    }));
    setRows((current) => [...current, ...accepted]);
    if (items.length > room) toast({ tone: "error", message: "นำเข้าได้สูงสุดครั้งละ 50 ตอน" });
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setIsReadingFiles(true);
    try {
      const sortedFiles = [...files].sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
      const parsed = await Promise.all(sortedFiles.map(async (file, index) => {
        const label = parseChapterLabel(file.name, defaults.chapterNumber + rows.length + index);
        return { ...label, content: await file.text(), source: file.name };
      }));
      appendRows(parsed);
      toast({ tone: "success", message: `อ่านไฟล์แล้ว ${parsed.length} ตอน กรุณาตรวจ preview ก่อนนำเข้า` });
    } catch {
      toast({ tone: "error", message: "อ่านไฟล์ไม่สำเร็จ กรุณาใช้ไฟล์ข้อความ UTF-8" });
    } finally {
      setIsReadingFiles(false);
    }
  }

  function parsePastedText() {
    const parsed = parseCombinedChapters(combinedText);
    if (!parsed.length) {
      toast({ tone: "error", message: "ไม่พบหัวตอน กรุณาขึ้นบรรทัดใหม่ด้วย “ตอนที่ 1 ชื่อตอน” หรือ “Chapter 1: Title”" });
      return;
    }
    appendRows(parsed.map((chapter) => ({ ...chapter, source: "ข้อความที่วาง" })));
    setCombinedText("");
    toast({ tone: "success", message: `แยกข้อความได้ ${parsed.length} ตอน` });
  }

  function updateRow<K extends keyof Pick<ImportRow, "chapterNumber" | "sortOrder" | "title" | "content">>(
    id: string,
    key: K,
    value: ImportRow[K],
  ) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, [key]: value } : row));
  }

  async function importChapters() {
    if (!rows.length) return;
    const duplicateNumbers = rows.some((row, index) => rows.findIndex((item) => item.chapterNumber === row.chapterNumber) !== index);
    const duplicateOrders = rows.some((row, index) => rows.findIndex((item) => item.sortOrder === row.sortOrder) !== index);
    if (duplicateNumbers || duplicateOrders) {
      toast({ tone: "error", message: duplicateNumbers ? "มีเลขตอนซ้ำกันในรายการ" : "มีลำดับแสดงผลซ้ำกันในรายการ" });
      return;
    }
    if (rows.some((row) => !row.title.trim() || !Number.isFinite(row.chapterNumber) || !Number.isInteger(row.sortOrder) || row.sortOrder < 1)) {
      toast({ tone: "error", message: "กรุณาตรวจชื่อ เลขตอน และลำดับให้ครบถ้วน" });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/chapters/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          novelSlug: novel.slug,
          chapters: rows.map((row) => ({
            chapterNumber: row.chapterNumber,
            sortOrder: row.sortOrder,
            title: row.title,
            content: row.content,
            excerpt: null,
            isFree: true,
            coinPrice: 0,
          })),
        }),
      });
      const payload = await response.json().catch(() => null) as unknown;
      if (!response.ok) throw new Error(apiErrorMessage(payload));
      toast({ tone: "success", message: `นำเข้า ${rows.length} ตอนเป็นฉบับร่างเรียบร้อยแล้ว` });
      router.push(`/admin/novels/${novel.slug}/chapters?status=DRAFT`);
      router.refresh();
    } catch (error) {
      toast({ tone: "error", message: error instanceof Error ? error.message : "นำเข้าตอนไม่สำเร็จ กรุณาลองอีกครั้ง" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="grid content-start gap-4">
        <Panel title="1. เลือกแหล่งข้อมูล" description="เลือกหลายไฟล์ หรือวางต้นฉบับรวม ระบบจะเตรียมรายการให้ตรวจสอบก่อนบันทึก">
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="grid content-start gap-3 rounded-[12px] border border-dashed border-border p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-muted text-[var(--brand-emphasis)]"><FilePlus2 className="h-5 w-5" /></span>
                <div><h3 className="text-sm font-semibold">เลือกไฟล์หลายตอน</h3><p className="mt-0.5 text-xs text-muted-foreground">รองรับ .txt และ .md สูงสุด 50 ไฟล์ เรียงตามชื่อไฟล์</p></div>
              </div>
              <Input
                type="file"
                accept=".txt,.md,.markdown,text/plain,text/markdown"
                multiple
                disabled={isReadingFiles || rows.length >= 50}
                onChange={(event) => {
                  void addFiles(event.target.files);
                  event.target.value = "";
                }}
                className="cursor-pointer file:mr-3 file:border-0 file:bg-transparent file:text-sm file:font-semibold"
              />
            </div>

            <div className="grid gap-3 rounded-[12px] border border-border p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-muted text-[var(--brand-emphasis)]"><FileText className="h-5 w-5" /></span>
                <div><h3 className="text-sm font-semibold">วางข้อความหลายตอน</h3><p className="mt-0.5 text-xs text-muted-foreground">แต่ละตอนต้องเริ่มด้วยหัวข้อ เช่น “ตอนที่ 1 เริ่มต้น”</p></div>
              </div>
              <Textarea value={combinedText} onChange={(event) => setCombinedText(event.target.value)} placeholder={'ตอนที่ 1 เริ่มต้น\nเนื้อหา...\n\nตอนที่ 2 พบเจอ\nเนื้อหา...'} className="min-h-40 font-mono text-xs" />
              <Button type="button" variant="outline" disabled={!combinedText.trim() || rows.length >= 50} onClick={parsePastedText}>แยกข้อความเป็นตอน</Button>
            </div>
          </div>
        </Panel>

        <Panel title={`2. ตรวจสอบก่อนนำเข้า (${rows.length} ตอน)`} description="แก้เลขตอน ลำดับ และชื่อได้ที่นี่ ทุกตอนจะถูกบันทึกเป็นฉบับร่าง">
          {rows.length ? (
            <div className="grid gap-3">
              {rows.map((row, index) => (
                <div key={row.id} className="rounded-[12px] border border-border bg-muted/20 p-3">
                  <div className="grid items-end gap-3 md:grid-cols-[auto_8rem_8rem_minmax(12rem,1fr)_auto]">
                    <GripVertical aria-hidden className="mb-3 hidden h-4 w-4 text-muted-foreground md:block" />
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">เลขตอน<Input type="number" min="0" step="0.01" value={row.chapterNumber} onChange={(event) => updateRow(row.id, "chapterNumber", Number(event.target.value))} /></label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">ลำดับ<Input type="number" min="1" step="1" value={row.sortOrder} onChange={(event) => updateRow(row.id, "sortOrder", Number(event.target.value))} /></label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">ชื่อตอน<Input value={row.title} maxLength={500} onChange={(event) => updateRow(row.id, "title", event.target.value)} /></label>
                    <button type="button" onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))} aria-label={`นำรายการที่ ${index + 1} ออก`} className="grid h-11 w-11 place-items-center rounded-[6px] text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <details className="mt-3 border-t border-border/70 pt-3">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground">ดู/แก้เนื้อหา · {row.content.length.toLocaleString("th-TH")} ตัวอักษร · {row.source}</summary>
                    <Textarea value={row.content} onChange={(event) => updateRow(row.id, "content", event.target.value)} className="mt-3 min-h-64 font-serif" />
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid min-h-40 place-items-center rounded-[12px] border border-dashed border-border text-center text-sm text-muted-foreground">
              <p>ยังไม่มีตอนสำหรับนำเข้า<br /><span className="text-xs">เลือกไฟล์หรือวางข้อความจากส่วนด้านบน</span></p>
            </div>
          )}
        </Panel>
      </div>

      <aside className="grid content-start gap-4 xl:sticky xl:top-6 xl:self-start">
        <Panel title="เรื่องที่จะนำเข้า">
          <div className="flex gap-3">
            <div className="relative h-28 w-[74px] shrink-0 overflow-hidden rounded-[8px] border border-border bg-muted">
              <Image src={assetUrl(novel.coverKey, publicAssetFallbacks.novelCover)} alt={`ปก ${novel.title}`} fill sizes="74px" className="object-cover" />
            </div>
            <div className="min-w-0"><p className="line-clamp-3 text-sm font-semibold">{novel.title}</p><p className="mt-2 text-xs text-muted-foreground">เริ่มแนะนำที่ตอน {defaults.chapterNumber} · ลำดับ {defaults.sortOrder}</p></div>
          </div>
        </Panel>
        <Panel title="ยืนยันการนำเข้า" description="ระบบบันทึกแบบ atomic: หากตอนใดซ้ำหรือไม่ถูกต้อง จะยังไม่บันทึกทั้งชุด">
          <div className="grid gap-3">
            <div className="rounded-[10px] bg-muted p-3 text-sm"><span className="text-muted-foreground">พร้อมนำเข้า</span><strong className="float-right">{rows.length} ตอน</strong></div>
            <Button type="button" onClick={importChapters} loading={isSubmitting} disabled={!rows.length || isReadingFiles}><Upload className="h-4 w-4" />นำเข้าเป็นฉบับร่าง</Button>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
