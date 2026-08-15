"use client";

import { useRouter } from "next/navigation";
import { Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Panel } from "@/components/admin/admin-ui";
import { ConfirmDialog, Modal } from "@/components/admin/modal";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import type { AdminGenreRow } from "@/services/admin-service";

type GenreDraft = {
  id?: string;
  slug?: string;
  name: string;
  thaiName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
};

async function errorMessage(response: Response) {
  const body = await response.json().catch(() => null) as { error?: { message?: string; fields?: Record<string, string[]> } } | null;
  return (body?.error?.fields && Object.values(body.error.fields).flat()[0]) || body?.error?.message || `Request failed (${response.status})`;
}

export function GenresView({ genres }: { genres: AdminGenreRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<GenreDraft | null>(null);
  const [pendingDeactivate, setPendingDeactivate] = useState<AdminGenreRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const nextSortOrder = genres.reduce((maximum, genre) => Math.max(maximum, genre.sortOrder), 0) + 1;

  function create() {
    setMessage("");
    setDraft({ name: "", thaiName: "", description: "", sortOrder: nextSortOrder, isActive: true });
  }

  function edit(genre: AdminGenreRow) {
    setMessage("");
    setDraft({
      id: genre.id,
      slug: genre.slug,
      name: genre.name,
      thaiName: genre.thaiName ?? "",
      description: genre.description ?? "",
      sortOrder: genre.sortOrder,
      isActive: genre.isActive,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") ?? ""),
      thaiName: String(form.get("thaiName") ?? "") || null,
      description: String(form.get("description") ?? "") || null,
      sortOrder: Number(form.get("sortOrder")),
      isActive: form.get("isActive") === "on",
    };
    try {
      const response = await fetch(draft.id ? `/api/admin/genres/${draft.id}` : "/api/admin/genres", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setDraft(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถบันทึกแนวนิยายได้");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(genre: AdminGenreRow) {
    const nextActive = !genre.isActive;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/genres/${genre.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: genre.name,
          thaiName: genre.thaiName,
          description: genre.description,
          sortOrder: genre.sortOrder,
          isActive: nextActive,
        }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "ไม่สามารถเปลี่ยนสถานะแนวนิยายได้");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      {message ? <p role="alert" className="rounded-[12px] border border-border bg-card px-4 py-3 text-sm text-destructive">{message}</p> : null}
      <Panel
        title="แนวนิยายจากฐานข้อมูล"
        description="Slug สร้างครั้งเดียวและไม่เปลี่ยนเมื่อแก้ชื่อ; การปิดใช้งานไม่ลบความสัมพันธ์เดิม"
        action={<Button onClick={create}><Plus className="h-4 w-4" />เพิ่มแนว</Button>}
      >
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="py-3 pr-4">ชื่อ</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">ลำดับ</th><th className="px-4 py-3">นิยาย</th><th className="px-4 py-3">สถานะ</th><th className="pl-4 py-3"><span className="sr-only">คำสั่ง</span></th></tr></thead>
          <tbody>{genres.map((genre) => <tr key={genre.id} className="border-b border-border/70 last:border-0">
            <td className="py-3 pr-4"><p className="font-semibold">{genre.thaiName || genre.name}</p><p className="text-xs text-muted-foreground">{genre.name}</p></td>
            <td className="px-4 py-3"><code className="rounded bg-muted px-1.5 py-0.5 text-xs">{genre.slug}</code></td>
            <td className="tabular px-4 py-3">{genre.sortOrder}</td><td className="tabular px-4 py-3">{genre.usageCount.toLocaleString("th-TH")}</td>
            <td className="px-4 py-3"><StatusPill label={genre.isActive ? "ใช้งาน" : "ปิดใช้งาน"} tone={genre.isActive ? "success" : "neutral"} /></td>
            <td className="pl-4 py-3"><div className="flex justify-end gap-1">
              <button type="button" onClick={() => edit(genre)} disabled={busy} aria-label={`แก้ไข ${genre.name}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted disabled:opacity-50"><Pencil className="h-4 w-4" /></button>
              <button type="button" onClick={() => { if (genre.isActive) setPendingDeactivate(genre); else void toggleActive(genre); }} disabled={busy} aria-label={genre.isActive ? `ปิดใช้งาน ${genre.name}` : `เปิดใช้งาน ${genre.name}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted disabled:opacity-50">{genre.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>
        {!genres.length ? <p className="py-8 text-center text-sm text-muted-foreground">ยังไม่มีแนวนิยาย กด “เพิ่มแนว” เพื่อสร้าง taxonomy แรกสำหรับ production</p> : null}
      </Panel>

      <Modal
        open={Boolean(draft)}
        onClose={() => { if (!busy) setDraft(null); }}
        title={draft?.id ? "แก้ไขแนวนิยาย" : "เพิ่มแนวนิยาย"}
        description={draft?.slug ? `Slug คงที่: ${draft.slug}` : "Slug จะสร้างอัตโนมัติจากชื่อและไม่ซ้ำในระบบ"}
        footer={<><Button type="button" variant="outline" disabled={busy} onClick={() => setDraft(null)}>ยกเลิก</Button><Button type="submit" form="genre-editor-form" loading={busy}>บันทึก</Button></>}
      >
        {draft ? <form id="genre-editor-form" onSubmit={submit} className="grid gap-4">
          <Field label="ชื่อสากล"><Input name="name" required minLength={2} maxLength={160} defaultValue={draft.name} placeholder="Fantasy" /></Field>
          <Field label="ชื่อภาษาไทย"><Input name="thaiName" maxLength={160} defaultValue={draft.thaiName} placeholder="แฟนตาซี" /></Field>
          <Field label="คำอธิบาย"><Textarea name="description" maxLength={2_000} defaultValue={draft.description} /></Field>
          <Field label="ลำดับแสดงผล"><Input name="sortOrder" type="number" min="0" step="1" required defaultValue={draft.sortOrder} /></Field>
          <label className="flex items-center gap-2 rounded-[12px] border border-border p-3 text-sm font-medium"><input name="isActive" type="checkbox" defaultChecked={draft.isActive} className="h-4 w-4 accent-[var(--brand-emphasis)]" />เปิดใช้งานในหน้าสาธารณะและฟอร์มนิยาย</label>
        </form> : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(pendingDeactivate)}
        onClose={() => setPendingDeactivate(null)}
        onConfirm={() => {
          const genre = pendingDeactivate;
          setPendingDeactivate(null);
          if (genre) void toggleActive(genre);
        }}
        title="ปิดใช้งานแนวนิยาย"
        description={`แนว “${pendingDeactivate?.thaiName || pendingDeactivate?.name || ""}” จะไม่แสดงในตัวเลือกสาธารณะ แต่ความสัมพันธ์กับนิยาย ${pendingDeactivate?.usageCount ?? 0} เรื่องจะยังคงอยู่และไม่มีข้อมูลถูกลบ`}
        confirmLabel="ปิดใช้งาน"
        tone="danger"
      />
    </div>
  );
}
