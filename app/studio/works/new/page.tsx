"use client";

import { ArrowLeft, ImagePlus, Info, Languages, PenLine, Save, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { StudioPageHeader, StudioPanel } from "@/components/studio/studio-ui";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { cn } from "@/lib/utils";

const SYNOPSIS_MAX = 600;

const genres = ["แฟนตาซี", "กำลังภายใน", "โรแมนซ์", "ผจญภัย", "สยองขวัญ", "วัยรุ่น", "เกมออนไลน์", "ชายรักชาย", "หญิงรักหญิง"];

const workTypes = [
  { value: "original", label: "แต่งเอง", icon: PenLine, hint: "คุณเป็นเจ้าของลิขสิทธิ์ในผลงานนี้" },
  { value: "translation", label: "งานแปล", icon: Languages, hint: "แปลจากผลงานของผู้อื่น ต้องมีสิทธิ์ในการแปล" },
] as const;

export default function NewWorkPage() {
  const [workType, setWorkType] = useState<"original" | "translation">("original");
  const [synopsis, setSynopsis] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);

  const toggleGenre = (genre: string) =>
    setSelectedGenres((current) =>
      current.includes(genre) ? current.filter((item) => item !== genre) : current.length >= 3 ? current : [...current, genre],
    );

  return (
    <>
      <Link
        href="/studio/works"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปผลงานของฉัน
      </Link>

      <StudioPageHeader
        eyebrow="NEW WORK"
        title="เพิ่มผลงานใหม่"
        description="กรอกข้อมูลเรื่องให้ครบก่อนส่งตรวจ ระหว่างนี้บันทึกเป็นฉบับร่างไว้ก่อนได้ ยังไม่มีใครเห็นจนกว่าจะเผยแพร่"
      />

      {/* No action wired up yet — this screen is the UX pass, not the data path. */}
      <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
        <StudioPanel title="ประเภทผลงาน" description="เลือกให้ตรงกับความเป็นจริง เพราะมีผลกับเอกสารสิทธิ์ที่เราขอ">
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {workTypes.map((type) => {
              const Icon = type.icon;
              const active = workType === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setWorkType(type.value)}
                  aria-pressed={active}
                  className={cn(
                    "tap-target rounded-xl border p-4 text-left transition-colors duration-[var(--dur-fast)]",
                    active ? "border-[var(--brand-emphasis)] bg-accent-subtle" : "border-border bg-card hover:border-[var(--brand-emphasis)]",
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5 text-brand-primary" />
                  <p className="mt-2 font-semibold">{type.label}</p>
                  <p className="mt-1 text-xs leading-6 text-(--text-secondary)">{type.hint}</p>
                </button>
              );
            })}
          </div>
        </StudioPanel>

        <StudioPanel title="ข้อมูลเรื่อง">
          <div className="grid gap-4 p-5">
            <Field label="ชื่อเรื่อง" hint="ชื่อที่ผู้อ่านจะเห็นในหน้าแรกและผลค้นหา">
              <Input placeholder="เช่น เกิดใหม่เป็นลิโป้" maxLength={120} />
            </Field>

            <Field label="ชื่อรอง (ไม่บังคับ)" hint="ชื่ออื่นที่คนมักใช้เรียกเรื่องนี้ ช่วยให้ค้นหาเจอง่ายขึ้น">
              <Input placeholder="เช่น ชื่อภาษาอังกฤษ หรือชื่อย่อที่คนเรียกกัน" maxLength={120} />
            </Field>

            <div className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium">เรื่องย่อ</span>
                <span
                  className={cn(
                    "text-xs tabular-nums",
                    synopsis.length > SYNOPSIS_MAX - 60 ? "text-[var(--brand-emphasis)]" : "text-(--text-tertiary)",
                  )}
                >
                  {synopsis.length}/{SYNOPSIS_MAX}
                </span>
              </div>
              <Textarea
                value={synopsis}
                onChange={(event) => setSynopsis(event.target.value.slice(0, SYNOPSIS_MAX))}
                placeholder="เล่าให้คนอ่านรู้ว่าเรื่องนี้เกี่ยวกับอะไร ทำไมถึงน่าติดตาม"
                className="min-h-40"
              />
              <p className="text-xs text-muted-foreground">สองบรรทัดแรกคือส่วนที่คนเห็นในการ์ดหน้าแรก เขียนให้ดึงดูดตั้งแต่ต้น</p>
            </div>

            <Field label="สถานะการเขียน">
              <Select defaultValue="ongoing">
                <option value="ongoing">กำลังเขียน / กำลังแปล</option>
                <option value="hiatus">พักชั่วคราว</option>
                <option value="completed">จบแล้ว</option>
              </Select>
            </Field>
          </div>
        </StudioPanel>

        {workType === "translation" ? (
          <StudioPanel title="ข้อมูลต้นฉบับ" description="จำเป็นสำหรับงานแปล เพื่อให้เครดิตถูกต้องและตรวจสอบสิทธิ์ได้">
            <div className="grid gap-4 p-5">
              <Field label="ชื่อเรื่องต้นฉบับ">
                <Input placeholder="ชื่อในภาษาต้นทาง" />
              </Field>
              <Field label="ผู้เขียนต้นฉบับ">
                <Input placeholder="ชื่อผู้เขียนตามที่ปรากฏในต้นฉบับ" />
              </Field>
              <Field label="ภาษาต้นทาง">
                <Select defaultValue="zh">
                  <option value="zh">จีน</option>
                  <option value="ko">เกาหลี</option>
                  <option value="ja">ญี่ปุ่น</option>
                  <option value="en">อังกฤษ</option>
                  <option value="other">อื่น ๆ</option>
                </Select>
              </Field>
              <Field label="ลิงก์ต้นฉบับ (ไม่บังคับ)" hint="ช่วยให้ทีมงานตรวจสอบที่มาได้เร็วขึ้น">
                <Input type="url" placeholder="https://" />
              </Field>
            </div>
          </StudioPanel>
        ) : null}

        <StudioPanel title="หมวดหมู่และแท็ก" description="เลือกได้สูงสุด 3 หมวด เพื่อให้ระบบแนะนำเรื่องของคุณได้ตรงกลุ่ม">
          <div className="grid gap-4 p-5">
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => {
                const active = selectedGenres.includes(genre);
                const disabled = !active && selectedGenres.length >= 3;
                return (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => toggleGenre(genre)}
                    aria-pressed={active}
                    disabled={disabled}
                    className={cn(
                      "tap-target min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors duration-[var(--dur-fast)]",
                      active
                        ? "border-transparent bg-[var(--brand-primary)] text-white shadow-[var(--sh-brand)]"
                        : "border-border bg-card text-(--text-secondary) hover:border-[var(--brand-emphasis)]",
                      disabled && "cursor-not-allowed opacity-40 hover:border-border",
                    )}
                  >
                    {genre}
                  </button>
                );
              })}
            </div>
            <Field label="แท็ก" hint="คั่นด้วยจุลภาค เช่น เกิดใหม่, ระบบ, ราชสำนัก">
              <Input placeholder="เพิ่มแท็กที่บอกลักษณะเฉพาะของเรื่อง" />
            </Field>
          </div>
        </StudioPanel>

        <StudioPanel title="ภาพปก" description="แนวตั้ง อัตราส่วน 2:3 ขนาดแนะนำ 800×1200 พิกเซล ไม่เกิน 2 MB">
          <div className="flex flex-wrap items-center gap-4 p-5">
            <span
              aria-hidden
              className="grid h-40 w-27 shrink-0 place-items-center rounded-[8px] border border-dashed border-border bg-muted/40 text-(--text-tertiary)"
            >
              <ImagePlus className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <Button type="button" variant="outline">
                เลือกไฟล์ภาพ
              </Button>
              <p className="mt-2 max-w-sm text-xs leading-6 text-(--text-tertiary)">
                ใช้ภาพที่คุณมีสิทธิ์ใช้เท่านั้น ปกที่ละเมิดลิขสิทธิ์จะถูกนำออกและนับเป็นการละเมิดตามนโยบายลิขสิทธิ์
              </p>
            </div>
          </div>
        </StudioPanel>

        <StudioPanel title="ยืนยันสิทธิ์" description="ข้อนี้ผูกกับข้อกำหนดการใช้บริการและนโยบายลิขสิทธิ์">
          <div className="p-5">
            <label className="flex cursor-pointer gap-3 rounded-xl bg-muted/40 p-4">
              <input
                type="checkbox"
                checked={rightsConfirmed}
                onChange={(event) => setRightsConfirmed(event.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--brand-primary)]"
              />
              <span className="text-sm leading-7 text-(--text-secondary)">
                ข้าพเจ้ายืนยันว่าเป็นเจ้าของลิขสิทธิ์ในผลงานนี้ หรือได้รับอนุญาตให้แปลและเผยแพร่โดยชอบด้วยกฎหมาย และรับทราบว่า
                การให้ข้อมูลเท็จอาจทำให้ผลงานถูกนำออกและบัญชีถูกระงับตาม{" "}
                <Link href="/copyright" className="font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline">
                  นโยบายลิขสิทธิ์
                </Link>
              </span>
            </label>

            <p className="mt-4 flex gap-2 text-xs leading-6 text-(--text-tertiary)">
              <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              หลังส่งตรวจ ทีมงานจะพิจารณาภายใน 3 วันทำการ ระหว่างรอคุณยังแก้ไขและเพิ่มตอนได้ตามปกติ
            </p>
          </div>
        </StudioPanel>

        <div className="sticky bottom-0 flex flex-wrap gap-3 border-t border-border bg-(--bg-base)/92 py-4 backdrop-blur-md">
          <Button type="submit" variant="primary" disabled={!rightsConfirmed}>
            <Send aria-hidden className="h-4 w-4" />
            ส่งตรวจเพื่อเผยแพร่
          </Button>
          <Button type="button" variant="outline">
            <Save aria-hidden className="h-4 w-4" />
            บันทึกฉบับร่าง
          </Button>
        </div>
      </form>
    </>
  );
}
