"use client";

import { useRouter } from "next/navigation";
import { Eye, PencilLine, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, type FormEvent } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import type { AdminChapterDetail, AdminNovelDetail } from "@/services/admin-service";

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string; fields?: Record<string, string[]> } } | null;
  return (body?.error?.fields && Object.values(body.error.fields).flat()[0]) || body?.error?.message || `Request failed (${response.status})`;
}

export function ChapterEditorView({
  novel,
  chapter,
  defaults,
}: {
  novel: AdminNovelDetail;
  chapter?: AdminChapterDetail;
  defaults: { chapterNumber: number; sortOrder: number };
}) {
  const router = useRouter();
  const [preview, setPreview] = useState(false);
  const [content, setContent] = useState(chapter?.content ?? "");
  const [title, setTitle] = useState(chapter?.title ?? "");
  const [chapterNumber, setChapterNumber] = useState(String(chapter?.chapterNumber ?? defaults.chapterNumber));
  const [isFree, setIsFree] = useState(chapter?.isFree ?? true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status"));
    const scheduledRaw = String(form.get("scheduledFor") ?? "");
    const payload = {
      ...(chapter ? {} : { novelSlug: novel.slug }),
      chapterNumber: Number(form.get("chapterNumber")),
      sortOrder: Number(form.get("sortOrder")),
      title: String(form.get("title") ?? ""),
      content,
      excerpt: String(form.get("excerpt") ?? ""),
      status,
      isFree,
      coinPrice: isFree ? 0 : Number(form.get("coinPrice")),
      scheduledFor: status === "SCHEDULED" && scheduledRaw ? new Date(scheduledRaw).toISOString() : null,
    };
    try {
      const response = await fetch(chapter ? `/api/admin/chapters/${chapter.id}` : "/api/admin/chapters", {
        method: chapter ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const body = await response.json() as { chapter: { novelSlug: string; chapterNumber: number } };
      router.push(`/admin/novels/${body.chapter.novelSlug}/chapters/${body.chapter.chapterNumber}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกตอนได้");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!chapter || !window.confirm(`ยืนยันการลบตอน ${chapter.chapterNumber}? ระบบจะเก็บเป็น soft delete`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/chapters/${chapter.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await errorMessage(response));
      router.push(`/admin/novels/${novel.slug}/chapters`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถลบตอนได้");
      setBusy(false);
    }
  }

  const paragraphs = content.split(/\n\s*\n/gu).map((item) => item.trim()).filter(Boolean);
  return (
    <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel
        title="เนื้อหาตอน"
        description="เลขตอนรองรับทศนิยมสองตำแหน่ง และลำดับอ่านกำหนดแยกด้วย sortOrder"
        action={<Button type="button" size="sm" variant="outline" onClick={() => setPreview((value) => !value)}>{preview ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{preview ? "แก้ไข" : "ตัวอย่าง"}</Button>}
      >
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[130px_130px_minmax(0,1fr)]">
            <Field label="เลขตอน"><Input name="chapterNumber" type="number" min="0" step="0.01" required value={chapterNumber} onChange={(event) => setChapterNumber(event.target.value)} /></Field>
            <Field label="ลำดับอ่าน"><Input name="sortOrder" type="number" min="1" step="1" required defaultValue={chapter?.sortOrder ?? defaults.sortOrder} /></Field>
            <Field label="ชื่อตอน"><Input name="title" required value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
          </div>
          {preview ? (
            <article className="min-h-[420px] rounded-[12px] border border-border bg-[var(--reader-bg)] p-6 text-[var(--reader-text)]">
              <h3 className="mb-6 text-xl font-bold">ตอน {chapterNumber}: {title || "ยังไม่มีชื่อตอน"}</h3>
              {paragraphs.length ? paragraphs.map((paragraph, index) => <p key={index} className="mb-4 text-[17px] leading-[1.95] last:mb-0">{paragraph}</p>) : <p className="text-sm opacity-70">ยังไม่มีเนื้อหา</p>}
            </article>
          ) : <Field label="เนื้อหา"><Textarea name="content" className="min-h-[520px] text-[15px] leading-[1.9]" value={content} onChange={(event) => setContent(event.target.value)} /></Field>}
          <Field label="ข้อความตัวอย่างสำหรับตอนที่ยังล็อก"><Textarea name="excerpt" defaultValue={chapter?.excerpt ?? ""} /></Field>
        </div>
      </Panel>

      <div className="grid content-start gap-4">
        <Panel title="การเผยแพร่">
          <div className="grid gap-4">
            <label className="grid gap-1.5"><Label>สถานะ</Label><Select name="status" defaultValue={chapter?.status === "SCHEDULED" ? "DRAFT" : chapter?.status ?? "DRAFT"}>
              <option value="DRAFT">ฉบับร่าง / ถอนเผยแพร่</option><option value="PUBLISHED">เผยแพร่ทันที</option><option value="ARCHIVED">เก็บถาวร</option>
            </Select></label>
            <div className="rounded-[12px] border border-border bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">การตั้งเวลาเผยแพร่ปิดไว้จนกว่าจะมี production scheduler ที่ retry และตรวจสอบผลได้</div>
            <fieldset className="grid gap-3 rounded-[12px] bg-muted/50 p-3">
              <legend className="px-1 text-sm font-medium">สิทธิ์การอ่าน</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(event) => setIsFree(event.target.checked)}
                  className="h-4 w-4 accent-[var(--brand-primary)]"
                />
                <span>
                  <span className="block text-sm font-medium">อ่านฟรี</span>
                  <span className="block text-xs text-muted-foreground">ปิดตัวเลือกนี้เมื่อต้องการให้ผู้อ่านปลดล็อกถาวรด้วยเหรียญ</span>
                </span>
              </label>
              {!isFree ? (
                <Field label="ราคาเหรียญ" hint="ราคาที่ผู้อ่านยืนยันจะถูกบันทึกไว้ในประวัติธุรกรรม">
                  <div className="relative">
                    <Image
                      src="/Images/Coins/nn-gold-coin.png"
                      alt=""
                      width={24}
                      height={24}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 object-contain"
                    />
                    <Input
                      name="coinPrice"
                      type="number"
                      min="1"
                      max="1000000"
                      step="1"
                      required
                      defaultValue={chapter?.isFree === false ? chapter.coinPrice : 1}
                      className="pl-11"
                    />
                  </div>
                </Field>
              ) : null}
            </fieldset>
            {message ? <p role="alert" className="rounded-[10px] bg-destructive/10 px-3 py-2 text-sm text-destructive">{message}</p> : null}
            <Button type="submit" loading={busy}><Save className="h-4 w-4" />บันทึกตอน</Button>
            <ButtonLink href={`/admin/novels/${novel.slug}/chapters`} variant="outline">กลับสารบัญ</ButtonLink>
            {chapter ? <Button type="button" variant="ghost" disabled={busy} onClick={() => void remove()} className="text-destructive"><Trash2 className="h-4 w-4" />ลบตอน</Button> : null}
          </div>
        </Panel>
        <Panel title="เรื่องนี้"><p className="font-semibold">{novel.title}</p><p className="mt-1 text-xs text-muted-foreground">{novel.totalChapters.toLocaleString("th-TH")} ตอนทั้งหมด · {novel.publishedChapters.toLocaleString("th-TH")} ตอนเผยแพร่</p></Panel>
      </div>
    </form>
  );
}
