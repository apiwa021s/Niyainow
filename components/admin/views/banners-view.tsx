"use client";

import Image from "next/image";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { useToast } from "@/components/ui/toast";
import { BANNER_SLOT } from "@/lib/admin-labels";
import { formatNumber } from "@/lib/utils";
import { adminBanners } from "@/data/admin-data";
import { adminNovels } from "@/data/admin-data";
import type { AdminBanner, BannerSlot } from "@/types/admin";

type Draft = { title: string; slot: BannerSlot; novelSlug: string; startAt: string; endAt: string; active: boolean };

const EMPTY: Draft = {
  title: "",
  slot: "hero",
  novelSlug: adminNovels[0]?.slug ?? "",
  startAt: "",
  endAt: "",
  active: true
};

export function BannersView() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminBanner | null>(null);

  const banners = [...adminBanners].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          ลำดับบนสุดคือแบนเนอร์ที่ผู้อ่านเห็นก่อน — แบนเนอร์ที่ปิดอยู่จะไม่ถูกนับ CTR
        </p>
        <Button
          onClick={() => {
            setEditing(EMPTY);
            setIsNew(true);
          }}
        >
          <Plus className="h-4 w-4" />
          เพิ่มแบนเนอร์
        </Button>
      </div>

      <ul className="grid gap-4">
        {banners.map((banner, index) => {
          const ctr = ((banner.clicks / banner.impressions) * 100).toFixed(2);
          const novel = adminNovels.find((item) => item.slug === banner.novelSlug);

          return (
            <li key={banner.id}>
              <article className="grid gap-4 rounded-[16px] border border-border bg-card p-4 shadow-[var(--sh-1)] md:grid-cols-[240px_minmax(0,1fr)]">
                <div className="relative aspect-16/9 overflow-hidden rounded-[12px] bg-muted">
                  <Image src={banner.image} alt="" fill sizes="240px" className="object-cover" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{banner.title}</h2>
                      <p className="truncate text-sm text-muted-foreground">
                        {BANNER_SLOT[banner.slot]} · ลิงก์ไป {novel?.thaiTitle ?? banner.novelSlug}
                      </p>
                    </div>
                    <StatusPill
                      label={banner.active ? "กำลังแสดง" : "ปิดอยู่"}
                      tone={banner.active ? "success" : "neutral"}
                    />
                  </div>

                  <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      <dt>ช่วงเวลา</dt>
                      <dd className="font-semibold text-foreground">
                        {banner.startAt} – {banner.endAt}
                      </dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>การมองเห็น</dt>
                      <dd className="tabular font-semibold text-foreground">{formatNumber(banner.impressions)}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>คลิก</dt>
                      <dd className="tabular font-semibold text-foreground">{formatNumber(banner.clicks)}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>CTR</dt>
                      <dd className="tabular font-semibold text-foreground">{ctr}%</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing({
                          title: banner.title,
                          slot: banner.slot,
                          novelSlug: banner.novelSlug,
                          startAt: banner.startAt,
                          endAt: banner.endAt,
                          active: banner.active
                        });
                        setIsNew(false);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      แก้ไข
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        toast({
                          tone: banner.active ? "info" : "success",
                          message: banner.active ? `ปิดแบนเนอร์ ${banner.title} แล้ว` : `เปิดแบนเนอร์ ${banner.title} แล้ว`
                        })
                      }
                    >
                      {banner.active ? "ปิดการแสดง" : "เปิดการแสดง"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      aria-label={`เลื่อน ${banner.title} ขึ้น`}
                      onClick={() => toast({ tone: "success", message: `เลื่อน ${banner.title} ขึ้นแล้ว` })}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                      เลื่อนขึ้น
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={index === banners.length - 1}
                      aria-label={`เลื่อน ${banner.title} ลง`}
                      onClick={() => toast({ tone: "success", message: `เลื่อน ${banner.title} ลงแล้ว` })}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                      เลื่อนลง
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(banner)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      ลบ
                    </Button>
                  </div>
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={isNew ? "เพิ่มแบนเนอร์" : "แก้ไขแบนเนอร์"}
        description="ภาพจะถูกดึงจากภาพพื้นหลังของเรื่องที่เลือกโดยอัตโนมัติ"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditing(null)}>
              ยกเลิก
            </Button>
            <Button
              disabled={(editing?.title.trim().length ?? 0) < 3}
              onClick={() => {
                toast({ tone: "success", message: isNew ? "เพิ่มแบนเนอร์แล้ว" : "บันทึกแบนเนอร์แล้ว" });
                setEditing(null);
              }}
            >
              {isNew ? "เพิ่มแบนเนอร์" : "บันทึก"}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="grid gap-4">
            <Field label="ชื่อแบนเนอร์" hint="ใช้ภายในทีมเท่านั้น ผู้อ่านไม่เห็นข้อความนี้">
              <Input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="ตำแหน่งที่แสดง">
                <Select value={editing.slot} onChange={(event) => setEditing({ ...editing, slot: event.target.value as BannerSlot })}>
                  {(Object.keys(BANNER_SLOT) as BannerSlot[]).map((slot) => (
                    <option key={slot} value={slot}>
                      {BANNER_SLOT[slot]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="ลิงก์ไปที่เรื่อง">
                <Select value={editing.novelSlug} onChange={(event) => setEditing({ ...editing, novelSlug: event.target.value })}>
                  {adminNovels.map((novel) => (
                    <option key={novel.slug} value={novel.slug}>
                      {novel.thaiTitle}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="เริ่มแสดง">
                <Input
                  value={editing.startAt}
                  onChange={(event) => setEditing({ ...editing, startAt: event.target.value })}
                  placeholder="14 ส.ค. 2026"
                />
              </Field>
              <Field label="สิ้นสุด">
                <Input
                  value={editing.endAt}
                  onChange={(event) => setEditing({ ...editing, endAt: event.target.value })}
                  placeholder="21 ส.ค. 2026"
                />
              </Field>
            </div>
            <label className="flex items-start gap-2.5 rounded-[12px] border border-border p-3">
              <input
                type="checkbox"
                checked={editing.active}
                onChange={(event) => setEditing({ ...editing, active: event.target.checked })}
                className="mt-0.5 h-4 w-4 accent-[var(--brand-primary)]"
              />
              <span className="text-sm font-medium">เปิดแสดงทันทีเมื่อถึงวันเริ่ม</span>
            </label>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => toast({ tone: "error", message: `ลบแบนเนอร์ ${deleteTarget?.title} แล้ว` })}
        title={`ลบแบนเนอร์ ${deleteTarget?.title ?? ""}?`}
        description="สถิติการมองเห็นและคลิกของแบนเนอร์นี้จะยังอยู่ในรายงานย้อนหลัง แต่แบนเนอร์จะหายจากหน้าเว็บทันที"
        confirmLabel="ลบแบนเนอร์"
        tone="danger"
      />
    </div>
  );
}
