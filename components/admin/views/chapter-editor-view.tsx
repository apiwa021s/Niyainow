"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, PencilLine, Save, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CHAPTER_COIN_PRICE } from "@/data/mock-data";
import type { AdminChapter, AdminNovel } from "@/types/admin";

/** เก็บตัวเลขเป็น string ในฟอร์ม แล้วค่อยแปลงตอนใช้งาน — ช่องว่างจะได้ไม่กลายเป็น NaN */
const schema = z.object({
  number: z.string().regex(/^\d+$/, "เลขตอนต้องเป็นจำนวนเต็มบวก"),
  title: z.string().min(2, "กรุณากรอกชื่อตอน"),
  body: z.string().min(50, "เนื้อหาสั้นเกินไป ควรมีอย่างน้อย 50 ตัวอักษร"),
  publishStatus: z.enum(["published", "draft", "scheduled"]),
  scheduledFor: z.string().optional(),
  locked: z.boolean(),
  coinPrice: z.string().regex(/^\d+$/, "ราคาต้องเป็นตัวเลขไม่ติดลบ")
});

type FormData = z.infer<typeof schema>;

export function ChapterEditorView({
  novel,
  chapter,
  body = []
}: {
  novel: AdminNovel;
  chapter?: AdminChapter;
  body?: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [preview, setPreview] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      number: String(chapter?.number ?? novel.chapters + 1),
      title: chapter?.title ?? "",
      body: body.join("\n\n"),
      publishStatus:
        chapter?.publishStatus === "scheduled" ? "scheduled" : chapter?.publishStatus === "published" ? "published" : "draft",
      scheduledFor: chapter?.scheduledFor ?? "",
      locked: chapter ? chapter.locked : true,
      coinPrice: String(chapter?.coinPrice || CHAPTER_COIN_PRICE)
    }
  });

  // ใช้ useWatch แทน watch() เพื่อให้ค่าเป็น "ค่า" ไม่ใช่ฟังก์ชัน — React Compiler จึง memo คอมโพเนนต์นี้ได้
  const bodyText = useWatch({ control, name: "body" }) ?? "";
  const publishStatus = useWatch({ control, name: "publishStatus" });
  const locked = useWatch({ control, name: "locked" });
  const chapterNumber = useWatch({ control, name: "number" });
  const chapterTitle = useWatch({ control, name: "title" });

  // นับคำแบบหยาบ ๆ: ภาษาไทยไม่มีเว้นวรรคระหว่างคำ จึงใช้จำนวนตัวอักษร/3 เป็นค่าประมาณ
  const characters = bodyText.replace(/\s/g, "").length;
  const estimatedWords = Math.round(characters / 3);
  const paragraphs = bodyText.split(/\n{2,}/).filter((line) => line.trim().length > 0);
  const readingMinutes = Math.max(1, Math.round(estimatedWords / 220));

  function onSubmit(data: FormData) {
    toast({
      tone: "success",
      message:
        data.publishStatus === "published"
          ? `เผยแพร่ตอนที่ ${data.number} แล้ว`
          : data.publishStatus === "scheduled"
            ? `ตั้งเวลาเผยแพร่ตอนที่ ${data.number} แล้ว`
            : `บันทึกฉบับร่างตอนที่ ${data.number} แล้ว`
    });
    router.push(`/admin/novels/${novel.slug}/chapters`);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-4">
        <Panel
          title="เนื้อหาตอน"
          description="เว้นบรรทัดว่างหนึ่งบรรทัดเพื่อขึ้นย่อหน้าใหม่"
          action={
            <Button type="button" size="sm" variant={preview ? "secondary" : "outline"} onClick={() => setPreview((value) => !value)}>
              {preview ? <PencilLine className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {preview ? "กลับไปแก้ไข" : "ดูตัวอย่าง"}
            </Button>
          }
        >
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
              <Field label="ตอนที่" error={errors.number?.message}>
                <Input type="number" min={1} {...register("number")} invalid={Boolean(errors.number)} className="tabular" />
              </Field>
              <Field label="ชื่อตอน" error={errors.title?.message}>
                <Input {...register("title")} invalid={Boolean(errors.title)} placeholder="เช่น จุดเริ่มต้นของค่ำคืน" />
              </Field>
            </div>

            {preview ? (
              <div className="rounded-[12px] border border-border bg-[var(--reader-bg)] p-5 text-[var(--reader-text)]">
                <h3 className="mb-4 text-lg font-bold">
                  ตอนที่ {chapterNumber}: {chapterTitle || "ยังไม่มีชื่อตอน"}
                </h3>
                {paragraphs.length === 0 ? (
                  <p className="text-sm opacity-70">ยังไม่มีเนื้อหาให้แสดงตัวอย่าง</p>
                ) : (
                  paragraphs.map((paragraph, index) => (
                    <p key={index} className="mb-4 text-[17px] leading-[1.95] last:mb-0">
                      {paragraph}
                    </p>
                  ))
                )}
              </div>
            ) : (
              <Field label="เนื้อหา" error={errors.body?.message}>
                <Textarea
                  {...register("body")}
                  invalid={Boolean(errors.body)}
                  className="min-h-[420px] font-sans text-[15px] leading-[1.9]"
                  placeholder="วางเนื้อหาตอนที่แปลเสร็จแล้วตรงนี้…"
                />
              </Field>
            )}

            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
              <div className="flex gap-1">
                <dt>ย่อหน้า</dt>
                <dd className="tabular font-semibold text-foreground">{paragraphs.length.toLocaleString("th-TH")}</dd>
              </div>
              <div className="flex gap-1">
                <dt>ตัวอักษร</dt>
                <dd className="tabular font-semibold text-foreground">{characters.toLocaleString("th-TH")}</dd>
              </div>
              <div className="flex gap-1">
                <dt>คำโดยประมาณ</dt>
                <dd className="tabular font-semibold text-foreground">{estimatedWords.toLocaleString("th-TH")}</dd>
              </div>
              <div className="flex gap-1">
                <dt>เวลาอ่าน</dt>
                <dd className="tabular font-semibold text-foreground">~{readingMinutes} นาที</dd>
              </div>
            </dl>
          </div>
        </Panel>
      </div>

      <div className="grid content-start gap-4">
        <Panel title="การเผยแพร่">
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <Label>สถานะ</Label>
              <Select {...register("publishStatus")}>
                <option value="draft">ฉบับร่าง</option>
                <option value="scheduled">ตั้งเวลาเผยแพร่</option>
                <option value="published">เผยแพร่ทันที</option>
              </Select>
            </label>

            {publishStatus === "scheduled" ? (
              <Field label="เผยแพร่เมื่อ" hint="ระบบจะปล่อยตอนอัตโนมัติตามเวลานี้">
                <Input {...register("scheduledFor")} placeholder="15 ส.ค. 2026 20:00 น." />
              </Field>
            ) : null}

            <label className="flex items-start gap-2.5 rounded-[12px] border border-border p-3">
              <input type="checkbox" {...register("locked")} className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" />
              <span className="text-sm">
                <span className="font-medium">ตอนนี้ต้องใช้เหรียญ</span>
                <span className="block text-xs text-muted-foreground">5 ตอนแรกของทุกเรื่องต้องอ่านฟรีเสมอ</span>
              </span>
            </label>

            <Field label="ราคา (เหรียญ)" error={errors.coinPrice?.message}>
              <Input
                type="number"
                min={0}
                {...register("coinPrice")}
                invalid={Boolean(errors.coinPrice)}
                disabled={!locked}
                className={cn("tabular", !locked && "opacity-60")}
              />
            </Field>

            <div className="grid gap-2">
              <Button type="submit" loading={isSubmitting}>
                {publishStatus === "published" ? <Send className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {publishStatus === "published" ? "เผยแพร่ตอนนี้" : publishStatus === "scheduled" ? "ตั้งเวลาเผยแพร่" : "บันทึกฉบับร่าง"}
              </Button>
              <ButtonLink href={`/admin/novels/${novel.slug}/chapters`} variant="outline">
                กลับไปหน้าสารบัญ
              </ButtonLink>
              {chapter ? (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                  ลบตอนนี้
                </Button>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel title="เรื่องนี้">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ชื่อเรื่อง</dt>
              <dd className="text-right font-medium">{novel.thaiTitle}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ตอนทั้งหมด</dt>
              <dd className="tabular text-right font-medium">{novel.chapters.toLocaleString("th-TH")}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">ทีมแปล</dt>
              <dd className="text-right font-medium">{novel.owner}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          toast({ tone: "error", message: `ลบตอนที่ ${chapter?.number} แล้ว` });
          router.push(`/admin/novels/${novel.slug}/chapters`);
        }}
        title={`ลบตอนที่ ${chapter?.number ?? ""}?`}
        description="ผู้อ่านที่ใช้เหรียญปลดล็อกตอนนี้ไว้จะได้รับเหรียญคืนอัตโนมัติ และคอมเมนต์ในตอนนี้จะถูกลบไปด้วย"
        confirmLabel="ลบตอนนี้"
        tone="danger"
      />
    </form>
  );
}
