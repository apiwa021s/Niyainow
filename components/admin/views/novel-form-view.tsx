"use client";

import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpenText,
  Check,
  CircleCheck,
  Info,
  Save,
  Tags,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { AssetUpload } from "@/components/admin/asset-upload";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Label, Select, Textarea } from "@/components/ui/form-controls";
import { responseMessage } from "@/lib/http/client-response";
import { cn } from "@/lib/utils";
import type { AdminNovelDetail, AdminReferenceData } from "@/services/admin-service";

function splitNames(value: FormDataEntryValue | null) {
  return String(value ?? "").split(",").map((item) => item.trim()).filter(Boolean);
}

function SectionTitle({ icon: Icon, children }: { icon: typeof BookOpenText; children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-[var(--brand-primary)]/10 text-[var(--brand-light-on-light)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <h3 className="text-sm font-semibold">{children}</h3>
    </div>
  );
}

export function NovelFormView({ novel, references }: { novel?: AdminNovelDetail; references: AdminReferenceData }) {
  const router = useRouter();
  const [coverKey, setCoverKey] = useState(novel?.coverKey ?? "");
  const [bannerKey, setBannerKey] = useState(novel?.bannerKey ?? "");
  const [selectedGenreIds, setSelectedGenreIds] = useState(() => novel?.genres.map((genre) => genre.id) ?? []);
  const [synopsisLength, setSynopsisLength] = useState(novel?.synopsis.length ?? 0);
  const [uploading, setUploading] = useState({ cover: false, banner: false });
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const uploadBusy = uploading.cover || uploading.banner;

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [dirty]);

  function updateAsset(type: "cover" | "banner", value: string) {
    if (type === "cover") setCoverKey(value);
    else setBannerKey(value);
    setDirty(true);
  }

  function toggleGenre(id: string) {
    setSelectedGenreIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    setDirty(true);
    setMessage("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadBusy) {
      setMessage("กรุณารอให้อัปโหลดภาพเสร็จก่อนบันทึก");
      return;
    }
    if (selectedGenreIds.length === 0) {
      setMessage("กรุณาเลือกแนวนิยายอย่างน้อย 1 แนว");
      document.querySelector<HTMLElement>("[data-genre-picker]")?.focus();
      return;
    }

    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const publicationStatus = String(form.get("publicationStatus"));
    const payload = {
      title: String(form.get("title") ?? ""),
      titleOriginal: String(form.get("titleOriginal") ?? ""),
      ...(novel ? {} : { slug: String(form.get("slug") ?? "") || undefined }),
      synopsis: String(form.get("synopsis") ?? ""),
      authorNames: splitNames(form.get("authors")),
      genreIds: selectedGenreIds,
      tagNames: splitNames(form.get("tags")),
      status: String(form.get("status")),
      publicationStatus,
      isFeatured: form.get("isFeatured") === "on",
      coverKey: coverKey || null,
      bannerKey: bannerKey || null,
      scheduledFor: null,
    };
    try {
      const response = await fetch(novel ? `/api/admin/novels/${novel.slug}` : "/api/admin/novels", {
        method: novel ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await responseMessage(response));
      const body = await response.json() as { novel: { slug: string } };
      setDirty(false);
      router.push(`/admin/novels/${body.novel.slug}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!novel || !window.confirm(`ยืนยันการเก็บ “${novel.title}” ออกจากระบบ? ข้อมูลจะถูก soft delete`)) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/novels/${novel.slug}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseMessage(response));
      setDirty(false);
      router.push("/admin/novels");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถลบนิยายได้");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      onChange={(event) => {
        if (!(event.target instanceof HTMLInputElement) || event.target.type !== "file") setDirty(true);
      }}
      className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"
    >
      <div className="grid min-w-0 content-start gap-5">
        <Panel title="ข้อมูลนิยาย" description="เริ่มจากข้อมูลที่ผู้อ่านจะเห็นบนหน้ารายละเอียดเรื่อง">
          <div className="grid gap-6">
            <section>
              <SectionTitle icon={BookOpenText}>ชื่อเรื่องและเรื่องย่อ</SectionTitle>
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="ชื่อเรื่องภาษาไทย">
                    <Input name="title" required minLength={2} defaultValue={novel?.title ?? ""} placeholder="ชื่อที่แสดงให้ผู้อ่านเห็น" />
                  </Field>
                  <Field label="ชื่อเรื่องต้นฉบับ" hint="ไม่บังคับ หากไม่มีให้เว้นว่าง">
                    <Input name="titleOriginal" defaultValue={novel?.titleOriginal ?? ""} placeholder="ชื่อภาษาเดิมของเรื่อง" />
                  </Field>
                </div>
                {!novel ? (
                  <Field label="Slug" hint="เว้นว่างเพื่อให้ระบบสร้างให้อัตโนมัติ หรือกรอกด้วย a-z, 0-9 และขีดกลาง">
                    <Input name="slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="my-novel-title" />
                  </Field>
                ) : null}
                <Field label="เรื่องย่อ" hint="อย่างน้อย 20 ตัวอักษร เขียนเป็นย่อหน้าสั้น ๆ เพื่อให้ผู้อ่านเข้าใจเนื้อเรื่องเร็วขึ้น">
                  <div className="relative">
                    <Textarea
                      name="synopsis"
                      required
                      minLength={20}
                      maxLength={10_000}
                      className="min-h-44 resize-y pb-8"
                      defaultValue={novel?.synopsis ?? ""}
                      placeholder="เล่าแก่นเรื่อง ตัวละครหลัก และจุดน่าสนใจ…"
                      onInput={(event) => setSynopsisLength(event.currentTarget.value.length)}
                    />
                    <span className="pointer-events-none absolute bottom-2.5 right-3 text-[11px] tabular-nums text-muted-foreground">
                      {synopsisLength.toLocaleString("th-TH")} / 10,000
                    </span>
                  </div>
                </Field>
              </div>
            </section>

            <div className="h-px bg-border" />

            <section>
              <SectionTitle icon={Tags}>ผู้แต่ง แท็ก และแนวนิยาย</SectionTitle>
              <div className="grid gap-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="ผู้แต่ง" hint="หากมีหลายคน ให้คั่นแต่ละชื่อด้วยเครื่องหมายจุลภาค (,)">
                    <Input name="authors" required defaultValue={novel?.authors.join(", ") ?? ""} placeholder="เช่น Tang Jia San Shao" />
                  </Field>
                  <Field label="แท็ก" hint="ไม่บังคับ คั่นแต่ละแท็กด้วยเครื่องหมายจุลภาค (,)">
                    <Input name="tags" defaultValue={novel?.tags.map((tag) => tag.name).join(", ") ?? ""} placeholder="เช่น ระบบ, แก้แค้น, พระเอกเก่ง" />
                  </Field>
                </div>

                <fieldset className="grid gap-2">
                  <legend className="text-sm font-medium">แนวนิยาย <span className="text-destructive">*</span></legend>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-xs text-muted-foreground">กดเลือกได้หลายแนวโดยไม่ต้องกด Ctrl หรือ Cmd</p>
                    <span className="text-xs text-muted-foreground">เลือกแล้ว {selectedGenreIds.length} แนว</span>
                  </div>
                  <div
                    data-genre-picker
                    tabIndex={-1}
                    className={cn(
                      "mt-1 grid max-h-72 gap-2 overflow-y-auto rounded-[12px] border bg-muted/25 p-3 sm:grid-cols-2 lg:grid-cols-3",
                      selectedGenreIds.length === 0 ? "border-border" : "border-border/70",
                    )}
                  >
                    {references.genres.map((genre) => {
                      const selected = selectedGenreIds.includes(genre.id);
                      return (
                        <label
                          key={genre.id}
                          className={cn(
                            "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[9px] border px-3 py-2 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                            selected
                              ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)]/10 font-semibold text-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-[var(--brand-emphasis)] hover:text-foreground",
                          )}
                        >
                          <input
                            type="checkbox"
                            name="genreIds"
                            value={genre.id}
                            checked={selected}
                            onChange={() => toggleGenre(genre.id)}
                            className="sr-only"
                          />
                          <span className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border", selected ? "border-[var(--brand-emphasis)] bg-[var(--brand-primary)] text-white" : "border-border bg-background")}>
                            {selected ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
                          </span>
                          <span>{genre.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>
            </section>
          </div>
        </Panel>

        <Panel title="รูปภาพประจำเรื่อง" description="เลือกภาพแล้วรอให้อัปโหลดสำเร็จ จากนั้นกดบันทึกข้อมูลอีกครั้ง">
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
            <AssetUpload
              assetType="cover"
              value={coverKey}
              onChange={(value) => updateAsset("cover", value)}
              onBusyChange={(value) => setUploading((current) => ({ ...current, cover: value }))}
            />
            <AssetUpload
              assetType="banner"
              value={bannerKey}
              onChange={(value) => updateAsset("banner", value)}
              onBusyChange={(value) => setUploading((current) => ({ ...current, banner: value }))}
            />
          </div>
        </Panel>
      </div>

      <aside className="grid content-start gap-5 xl:sticky xl:top-20">
        <Panel title="สถานะและการเผยแพร่" bodyClassName="p-4">
          <div className="grid gap-4">
            {novel ? (
              <div className="rounded-[10px] bg-muted/65 px-3 py-2.5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Slug ถาวร</p>
                <p className="mt-0.5 truncate font-mono text-xs text-foreground" title={novel.slug}>{novel.slug}</p>
              </div>
            ) : null}

            <label className="grid gap-1.5">
              <Label>สถานะเนื้อเรื่อง</Label>
              <Select name="status" defaultValue={novel?.status ?? "ONGOING"}>
                <option value="ONGOING">กำลังดำเนินเรื่อง</option>
                <option value="COMPLETED">จบแล้ว</option>
                <option value="HIATUS">พักการเขียน</option>
                <option value="CANCELLED">ยุติ</option>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <Label>การมองเห็น</Label>
              <Select name="publicationStatus" defaultValue={novel?.publicationStatus === "SCHEDULED" ? "DRAFT" : novel?.publicationStatus ?? "DRAFT"}>
                <option value="DRAFT">ฉบับร่าง — ยังไม่แสดง</option>
                <option value="IN_REVIEW">รอตรวจสอบ</option>
                <option value="PUBLISHED">เผยแพร่แล้ว</option>
                <option value="ARCHIVED">เก็บถาวร</option>
              </Select>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-[12px] border border-border p-3 transition hover:bg-muted/50">
              <input type="checkbox" name="isFeatured" defaultChecked={novel?.isFeatured ?? false} className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--brand-emphasis)]" />
              <span>
                <span className="block text-sm font-medium">แสดงเป็นเรื่องแนะนำ</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">ใช้พื้นที่แนะนำของหน้าเว็บเพื่อช่วยให้ผู้อ่านค้นพบเรื่องนี้</span>
              </span>
            </label>

            <div className="flex gap-2 rounded-[10px] bg-blue-500/10 px-3 py-2.5 text-xs leading-relaxed text-blue-700 dark:text-blue-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              ระบบตั้งเวลาเผยแพร่ยังไม่เปิดใช้งาน จึงแสดงเฉพาะสถานะที่ใช้ได้จริง
            </div>
          </div>
        </Panel>

        <Panel bodyClassName="p-4">
          <div className="grid gap-3">
            {message ? (
              <p role="alert" className="flex items-start gap-2 rounded-[10px] bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {message}
              </p>
            ) : null}

            <Button type="submit" loading={busy} disabled={uploadBusy} className="w-full text-slate-950">
              <Save className="h-4 w-4" aria-hidden />
              บันทึกข้อมูล
            </Button>
            <p className={cn("flex items-center justify-center gap-1.5 text-xs", dirty ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
              {dirty ? <AlertCircle className="h-3.5 w-3.5" aria-hidden /> : <CircleCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden />}
              {uploadBusy ? "กำลังอัปโหลดภาพ กรุณารอสักครู่" : dirty ? "มีการแก้ไขที่ยังไม่ได้บันทึก" : "ข้อมูลล่าสุดถูกบันทึกแล้ว"}
            </p>
            <ButtonLink href="/admin/novels" variant="outline" className="w-full">กลับหน้ารายการนิยาย</ButtonLink>

            {novel ? (
              <div className="mt-1 border-t border-border pt-3">
                <Button type="button" variant="ghost" disabled={busy || uploadBusy} onClick={() => void remove()} className="w-full text-destructive">
                  <Trash2 className="h-4 w-4" aria-hidden />
                  ลบนิยาย
                </Button>
              </div>
            ) : null}
          </div>
        </Panel>
      </aside>
    </form>
  );
}
