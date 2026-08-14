"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { AssetUpload } from "@/components/admin/asset-upload";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { assetUrl } from "@/lib/site-config";
import type { AdminBannerRow } from "@/services/admin-service";

type BannerDraft = {
  id?: string;
  title: string;
  subtitle: string;
  imageKey: string;
  linkUrl: string;
  ctaLabel: string;
  sortOrder: number;
  isActive: boolean;
  startsAt: string;
  endsAt: string;
};

/** `datetime-local` speaks local wall time; the API speaks ISO with offset. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIso(localValue: string) {
  if (!localValue) return null;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function scheduleLabel(banner: AdminBannerRow) {
  const format = (iso: string) => new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
  if (banner.startsAt && banner.endsAt) return `${format(banner.startsAt)} – ${format(banner.endsAt)}`;
  if (banner.startsAt) return `ตั้งแต่ ${format(banner.startsAt)}`;
  if (banner.endsAt) return `ถึง ${format(banner.endsAt)}`;
  return "ตลอดเวลา";
}

/** Active plus inside its schedule window — matches getActiveBanners. */
function isLive(banner: AdminBannerRow, now = Date.now()) {
  if (!banner.isActive) return false;
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return false;
  if (banner.endsAt && new Date(banner.endsAt).getTime() < now) return false;
  return true;
}

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string; fields?: Record<string, string[]> } } | null;
  return (body?.error?.fields && Object.values(body.error.fields).flat()[0]) || body?.error?.message || `Request failed (${response.status})`;
}

export function BannersView({ banners }: { banners: AdminBannerRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<BannerDraft | null>(null);
  const [imageKey, setImageKey] = useState("");
  const [pendingDelete, setPendingDelete] = useState<AdminBannerRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const nextSortOrder = banners.reduce((maximum, banner) => Math.max(maximum, banner.sortOrder), 0) + 1;

  function create() {
    setMessage("");
    setImageKey("");
    setDraft({ title: "", subtitle: "", imageKey: "", linkUrl: "", ctaLabel: "", sortOrder: nextSortOrder, isActive: true, startsAt: "", endsAt: "" });
  }

  function edit(banner: AdminBannerRow) {
    setMessage("");
    setImageKey(banner.imageKey);
    setDraft({
      id: banner.id,
      title: banner.title,
      subtitle: banner.subtitle ?? "",
      imageKey: banner.imageKey,
      linkUrl: banner.linkUrl ?? "",
      ctaLabel: banner.ctaLabel ?? "",
      sortOrder: banner.sortOrder,
      isActive: banner.isActive,
      startsAt: toLocalInput(banner.startsAt),
      endsAt: toLocalInput(banner.endsAt),
    });
  }

  async function save(payload: Record<string, unknown>, id?: string, failureMessage = "ไม่สามารถบันทึกแบนเนอร์ได้") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(id ? `/api/admin/banners/${id}` : "/api/admin/banners", {
        method: id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setDraft(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : failureMessage);
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (!imageKey) {
      setMessage("ต้องอัปโหลดภาพแบนเนอร์ก่อนบันทึก");
      return;
    }
    const form = new FormData(event.currentTarget);
    await save(
      {
        title: String(form.get("title") ?? ""),
        subtitle: String(form.get("subtitle") ?? "") || null,
        imageKey,
        linkUrl: String(form.get("linkUrl") ?? "") || null,
        ctaLabel: String(form.get("ctaLabel") ?? "") || null,
        sortOrder: Number(form.get("sortOrder")),
        isActive: form.get("isActive") === "on",
        startsAt: toIso(String(form.get("startsAt") ?? "")),
        endsAt: toIso(String(form.get("endsAt") ?? "")),
      },
      draft.id,
    );
  }

  async function toggleActive(banner: AdminBannerRow) {
    await save(
      {
        title: banner.title,
        subtitle: banner.subtitle,
        imageKey: banner.imageKey,
        linkUrl: banner.linkUrl,
        ctaLabel: banner.ctaLabel,
        sortOrder: banner.sortOrder,
        isActive: !banner.isActive,
        startsAt: banner.startsAt,
        endsAt: banner.endsAt,
      },
      banner.id,
      "ไม่สามารถเปลี่ยนสถานะแบนเนอร์ได้",
    );
  }

  async function remove(banner: AdminBannerRow) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await errorMessage(response));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถลบแบนเนอร์ได้");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {message ? <p role="alert" className="rounded-[12px] border border-border bg-card px-4 py-3 text-sm text-destructive">{message}</p> : null}
      <Panel
        title="แบนเนอร์หน้าแรก"
        description="แสดงเรียงตามลำดับที่กำหนด เฉพาะแบนเนอร์ที่เปิดใช้งานและอยู่ในช่วงเวลาที่ตั้งไว้เท่านั้นจึงจะขึ้นหน้าเว็บ"
        action={<Button onClick={create}><Plus className="h-4 w-4" />เพิ่มแบนเนอร์</Button>}
      >
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-3 pr-4">แบนเนอร์</th><th className="px-4 py-3">ลิงก์</th><th className="px-4 py-3">ช่วงเวลา</th><th className="px-4 py-3">ลำดับ</th><th className="px-4 py-3">สถานะ</th><th className="py-3 pl-4"><span className="sr-only">คำสั่ง</span></th>
          </tr></thead>
          <tbody>{banners.map((banner) => <tr key={banner.id} className="border-b border-border/70 last:border-0">
            <td className="py-3 pr-4"><div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assetUrl(banner.imageKey)} alt="" className="h-10 w-24 shrink-0 rounded-[8px] object-cover ring-1 ring-border" />
              <div className="min-w-0"><p className="truncate font-semibold">{banner.title}</p>{banner.subtitle ? <p className="truncate text-xs text-muted-foreground">{banner.subtitle}</p> : null}</div>
            </div></td>
            <td className="px-4 py-3">{banner.linkUrl ? <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{banner.linkUrl}</code> : <span className="text-xs text-muted-foreground">ไม่มี</span>}</td>
            <td className="tabular px-4 py-3 text-xs">{scheduleLabel(banner)}</td>
            <td className="tabular px-4 py-3">{banner.sortOrder}</td>
            <td className="px-4 py-3">
              <StatusPill
                label={isLive(banner) ? "แสดงอยู่" : banner.isActive ? "นอกช่วงเวลา" : "ปิดใช้งาน"}
                tone={isLive(banner) ? "success" : banner.isActive ? "warning" : "neutral"}
              />
            </td>
            <td className="py-3 pl-4"><div className="flex justify-end gap-1">
              <button type="button" onClick={() => edit(banner)} disabled={busy} aria-label={`แก้ไข ${banner.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted disabled:opacity-50"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => void toggleActive(banner)} disabled={busy} aria-label={banner.isActive ? `ปิดใช้งาน ${banner.title}` : `เปิดใช้งาน ${banner.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted disabled:opacity-50">{banner.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</button>
              <button type="button" onClick={() => setPendingDelete(banner)} disabled={busy} aria-label={`ลบ ${banner.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] text-destructive hover:bg-muted disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
        {!banners.length ? <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีแบนเนอร์ — เมื่อไม่มีแบนเนอร์ที่แสดงอยู่ หน้าแรกจะใช้ hero มาตรฐานแทน</p> : null}
      </Panel>

      <Modal
        open={Boolean(draft)}
        onClose={() => { if (!busy) setDraft(null); }}
        title={draft?.id ? "แก้ไขแบนเนอร์" : "เพิ่มแบนเนอร์"}
        description="ภาพจะถูกอัปโหลดและตรวจสอบทันที ส่วนข้อความและช่วงเวลาจะบันทึกเมื่อกดบันทึก"
        size="lg"
        footer={<><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>ยกเลิก</Button><Button type="submit" form="banner-editor-form" loading={busy}>บันทึก</Button></>}
      >
        {draft ? <form id="banner-editor-form" onSubmit={submit} className="grid gap-4">
          <Field label="ภาพแบนเนอร์"><AssetUpload assetType="banner" value={imageKey} onChange={setImageKey} title="ภาพแบนเนอร์หน้าแรก" description="แนะนำ 1600 x 700px" /></Field>
          <Field label="หัวข้อ"><Input name="title" required minLength={2} maxLength={200} defaultValue={draft.title} placeholder="อ่านฟรีสัปดาห์นี้" /></Field>
          <Field label="คำอธิบาย"><Textarea name="subtitle" maxLength={500} defaultValue={draft.subtitle} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ลิงก์ปลายทาง"><Input name="linkUrl" maxLength={2_000} defaultValue={draft.linkUrl} placeholder="/novels?status=completed" /></Field>
            <Field label="ข้อความปุ่ม"><Input name="ctaLabel" maxLength={80} defaultValue={draft.ctaLabel} placeholder="อ่านเลย" /></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="เริ่มแสดง"><Input name="startsAt" type="datetime-local" defaultValue={draft.startsAt} /></Field>
            <Field label="หยุดแสดง"><Input name="endsAt" type="datetime-local" defaultValue={draft.endsAt} /></Field>
            <Field label="ลำดับแสดงผล"><Input name="sortOrder" type="number" min="0" step="1" required defaultValue={draft.sortOrder} /></Field>
          </div>
          <label className="flex items-center gap-2 rounded-[12px] border border-border p-3 text-sm font-medium"><input name="isActive" type="checkbox" defaultChecked={draft.isActive} className="h-4 w-4 accent-[var(--brand-primary)]" />เปิดใช้งาน</label>
        </form> : null}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => {
          const banner = pendingDelete;
          setPendingDelete(null);
          if (banner) void remove(banner);
        }}
        title="ลบแบนเนอร์"
        description={`แบนเนอร์ “${pendingDelete?.title ?? ""}” จะถูกลบออกจากระบบ และไฟล์ภาพจะถูกทำเครื่องหมายรอลบหากไม่มีที่อื่นใช้งาน`}
        confirmLabel="ลบ"
        tone="danger"
      />
    </div>
  );
}
