"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Save, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { Panel } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/modal";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { PUBLISH_STATUS } from "@/lib/admin-labels";
import { slugify } from "@/lib/utils";
import { genres } from "@/data/mock-data";
import type { AdminNovel, PublishStatus } from "@/types/admin";

/** ตรวจตั้งแต่ฝั่งฟอร์ม เพื่อให้ผู้ใช้เห็น error ใต้ช่องทันที ไม่ต้องรอ submit ซ้ำ */
const schema = z.object({
  thaiTitle: z.string().min(2, "กรุณากรอกชื่อเรื่องภาษาไทย"),
  title: z.string().min(2, "กรุณากรอกชื่อเรื่องภาษาอังกฤษ"),
  slug: z
    .string()
    .min(2, "กรุณากรอก slug")
    .regex(/^[a-z0-9-]+$/, "ใช้ได้เฉพาะ a–z, 0–9 และขีดกลาง"),
  author: z.string().min(2, "กรุณากรอกชื่อผู้แต่ง"),
  owner: z.string().min(2, "กรุณาระบุทีมที่ดูแลเรื่องนี้"),
  synopsis: z.string().min(20, "เรื่องย่อควรยาวอย่างน้อย 20 ตัวอักษร"),
  cover: z.string().url("ลิงก์รูปปกไม่ถูกต้อง"),
  backdrop: z.string().url("ลิงก์ภาพพื้นหลังไม่ถูกต้อง"),
  status: z.enum(["ongoing", "completed", "hiatus"]),
  publishStatus: z.enum(["published", "draft", "scheduled", "review", "rejected"]),
  genres: z.array(z.string()).min(1, "เลือกอย่างน้อย 1 แนว"),
  tags: z.string().optional(),
  featured: z.boolean(),
  hasPaidChapters: z.boolean()
});

type FormData = z.infer<typeof schema>;

const EMPTY: FormData = {
  thaiTitle: "",
  title: "",
  slug: "",
  author: "",
  owner: "NiyaiNow Translation",
  synopsis: "",
  cover: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?auto=format&fit=crop&w=600&q=80",
  backdrop: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  status: "ongoing",
  publishStatus: "draft",
  genres: [],
  tags: "",
  featured: false,
  hasPaidChapters: true
};

export function NovelFormView({ novel }: { novel?: AdminNovel }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: novel
      ? {
          thaiTitle: novel.thaiTitle,
          title: novel.title,
          slug: novel.slug,
          author: novel.author,
          owner: novel.owner,
          synopsis: novel.synopsis,
          cover: novel.cover,
          backdrop: novel.backdrop,
          status: novel.status,
          publishStatus: novel.publishStatus,
          genres: novel.genres,
          tags: novel.tags.join(", "),
          featured: Boolean(novel.featured),
          hasPaidChapters: Boolean(novel.hasPaidChapters)
        }
      : EMPTY
  });

  // ใช้ useWatch แทน watch() เพื่อให้ค่าเป็น "ค่า" ไม่ใช่ฟังก์ชัน — React Compiler จึง memo คอมโพเนนต์นี้ได้
  const cover = useWatch({ control, name: "cover" });
  const selectedGenres = useWatch({ control, name: "genres" });
  const thaiTitle = useWatch({ control, name: "thaiTitle" });
  const englishTitle = useWatch({ control, name: "title" });
  const author = useWatch({ control, name: "author" });

  function onSubmit(data: FormData) {
    toast({
      tone: "success",
      message: novel ? `บันทึกการแก้ไข ${data.thaiTitle} แล้ว` : `เพิ่ม ${data.thaiTitle} เข้าระบบแล้ว`
    });
    router.push("/admin/novels");
  }

  function toggleGenre(slug: string) {
    const next = selectedGenres.includes(slug) ? selectedGenres.filter((item) => item !== slug) : [...selectedGenres, slug];
    setValue("genres", next, { shouldValidate: true });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid content-start gap-4">
        <Panel title="ข้อมูลเรื่อง" description="ชื่อเรื่องและ slug จะถูกใช้ในลิงก์หน้าเว็บจริง">
          <div className="grid gap-4">
            <Field label="ชื่อเรื่อง (ไทย)" error={errors.thaiTitle?.message}>
              <Input {...register("thaiTitle")} invalid={Boolean(errors.thaiTitle)} placeholder="เช่น ฉันกลายเป็นราชาในโลกแห่งเงา" />
            </Field>

            <Field label="ชื่อเรื่อง (อังกฤษ)" error={errors.title?.message}>
              <Input {...register("title")} invalid={Boolean(errors.title)} placeholder="I Became the King in the World of Shadows" />
            </Field>

            <Field
              label="Slug (ใช้ในลิงก์)"
              error={errors.slug?.message}
              hint={novel ? "เปลี่ยน slug แล้วลิงก์เดิมที่แชร์ไปจะเข้าไม่ได้" : "เว้นว่างไว้แล้วกดปุ่มสร้างจากชื่ออังกฤษก็ได้"}
            >
              <div className="flex gap-2">
                <Input {...register("slug")} invalid={Boolean(errors.slug)} placeholder="shadow-king" />
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => setValue("slug", slugify(englishTitle), { shouldValidate: true })}
                >
                  สร้างจากชื่อ
                </Button>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ผู้แต่ง" error={errors.author?.message}>
                <Input {...register("author")} invalid={Boolean(errors.author)} />
              </Field>
              <Field label="ทีมแปล/ผู้ดูแล" error={errors.owner?.message}>
                <Input {...register("owner")} invalid={Boolean(errors.owner)} />
              </Field>
            </div>

            <Field label="เรื่องย่อ" error={errors.synopsis?.message} hint="แสดงบนหน้ารายละเอียดและใช้เป็น description ของ SEO">
              <Textarea {...register("synopsis")} invalid={Boolean(errors.synopsis)} className="min-h-32" />
            </Field>
          </div>
        </Panel>

        <Panel title="แนวและแท็ก" description="เลือกแนวได้หลายแนว เรียงตามความสำคัญจากซ้ายไปขวา">
          <fieldset className="grid gap-3">
            <legend className="sr-only">เลือกแนวนิยาย</legend>
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const active = selectedGenres.includes(genre.slug);
                return (
                  <label
                    key={genre.slug}
                    className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-[8px] border px-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/12 text-[var(--brand-light-on-light)]"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleGenre(genre.slug)}
                      className="h-4 w-4 accent-[var(--brand-primary)]"
                    />
                    {genre.thaiName}
                  </label>
                );
              })}
            </div>
            {errors.genres ? (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.genres.message}
              </p>
            ) : null}
          </fieldset>

          <div className="mt-4">
            <Field label="แท็ก" hint="คั่นด้วยจุลภาค เช่น System, Reincarnation, Academy">
              <Input {...register("tags")} placeholder="System, Reincarnation" />
            </Field>
          </div>
        </Panel>

        <Panel title="รูปภาพ" description="ใช้ลิงก์รูปภายนอกได้ (ระบบสาธิตยังไม่มีที่เก็บไฟล์)">
          <div className="grid gap-4">
            <Field label="ลิงก์รูปปก (แนวตั้ง 2:3)" error={errors.cover?.message}>
              <Input {...register("cover")} invalid={Boolean(errors.cover)} />
            </Field>
            <Field label="ลิงก์ภาพพื้นหลัง (แนวนอน)" error={errors.backdrop?.message}>
              <Input {...register("backdrop")} invalid={Boolean(errors.backdrop)} />
            </Field>
          </div>
        </Panel>
      </div>

      {/* ---------------- คอลัมน์ขวา: เผยแพร่ + ตัวอย่างปก ---------------- */}
      <div className="grid content-start gap-4">
        <Panel title="การเผยแพร่">
          <div className="grid gap-4">
            <label className="grid gap-1.5">
              <Label>สถานะในระบบ</Label>
              <Select {...register("publishStatus")}>
                {(Object.keys(PUBLISH_STATUS) as PublishStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {PUBLISH_STATUS[status].label}
                  </option>
                ))}
              </Select>
            </label>

            <label className="grid gap-1.5">
              <Label>สถานะการแปล</Label>
              <Select {...register("status")}>
                <option value="ongoing">กำลังแปล</option>
                <option value="completed">จบแล้ว</option>
                <option value="hiatus">พักการแปล</option>
              </Select>
            </label>

            <label className="flex items-start gap-2.5 rounded-[12px] border border-border p-3">
              <input type="checkbox" {...register("featured")} className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" />
              <span className="text-sm">
                <span className="font-medium">ตั้งเป็นเรื่องแนะนำ</span>
                <span className="block text-xs text-muted-foreground">แสดงในแบนเนอร์ใหญ่และแถวแนะนำหน้าแรก</span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 rounded-[12px] border border-border p-3">
              <input type="checkbox" {...register("hasPaidChapters")} className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]" />
              <span className="text-sm">
                <span className="font-medium">มีตอนที่ต้องใช้เหรียญ</span>
                <span className="block text-xs text-muted-foreground">5 ตอนแรกยังอ่านฟรีเสมอตามนโยบายของเว็บ</span>
              </span>
            </label>

            <div className="grid gap-2">
              <Button type="submit" loading={isSubmitting}>
                <Save className="h-4 w-4" />
                {novel ? "บันทึกการแก้ไข" : "เพิ่มนิยาย"}
              </Button>
              {novel ? (
                <>
                  <ButtonLink href={`/novel/${novel.slug}`} variant="outline">
                    <Eye className="h-4 w-4" />
                    ดูหน้าเว็บจริง
                  </ButtonLink>
                  <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                    <Trash2 className="h-4 w-4" />
                    ลบเรื่องนี้
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        </Panel>

        <Panel title="ตัวอย่างการ์ด" description="หน้าตาโดยประมาณเมื่อขึ้นหน้าเว็บจริง">
          <div className="mx-auto w-40">
            <div className="relative aspect-[2/3] overflow-hidden rounded-[12px] border border-border bg-muted">
              {cover ? <Image src={cover} alt="" fill sizes="160px" className="object-cover" /> : null}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold">{thaiTitle || "ชื่อเรื่องจะแสดงตรงนี้"}</p>
            <p className="text-xs text-muted-foreground">{author || "ผู้แต่ง"}</p>
          </div>
        </Panel>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          toast({ tone: "error", message: `ลบ ${novel?.thaiTitle} แล้ว` });
          router.push("/admin/novels");
        }}
        title={`ลบ ${novel?.thaiTitle ?? ""}?`}
        description="ตอนทั้งหมด คอมเมนต์ และประวัติการอ่านของเรื่องนี้จะถูกลบไปด้วย ผู้ที่ซื้อตอนไว้จะได้รับเหรียญคืนอัตโนมัติ"
        confirmLabel="ลบเรื่องนี้"
        tone="danger"
      />
    </form>
  );
}
