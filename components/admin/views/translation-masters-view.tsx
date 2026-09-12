"use client";

import { CheckCircle2, Search, ShieldCheck, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Panel, StatCard } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { useAppDialog } from "@/components/ui/modal";
import type { getTranslationMasterAdminData } from "@/services/translation-master-service";

type Data = Awaited<ReturnType<typeof getTranslationMasterAdminData>>;

export function TranslationMastersView({ data }: { data: Data }) {
  const router = useRouter();
  const dialogs = useAppDialog();
  const [dataset, setDataset] = useState("ALL");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const datasets = [...new Set(data.records.map((row) => row.dataset))];
  const rows = useMemo(() => data.records.filter((row) => {
    const matchesDataset = dataset === "ALL" || row.dataset === dataset;
    const needle = query.trim().toLowerCase();
    return matchesDataset && (!needle || `${row.recordKey} ${row.name}`.toLowerCase().includes(needle));
  }), [data.records, dataset, query]);

  async function review(action: "APPROVE_DRAFT_SET" | "REJECT_DRAFT_SET") {
    const approving = action === "APPROVE_DRAFT_SET";
    if (!await dialogs.confirm({
      title: approving ? "อนุมัติกฎกลางชุดนี้หรือไม่?" : "ปฏิเสธกฎกลางชุดนี้หรือไม่?",
      description: approving
        ? `กฎที่รอตรวจทั้ง ${data.overview.draft.toLocaleString("th-TH")} รายการจะถูกเปิดใช้กับงานแปลที่สร้างใหม่`
        : `กฎที่รอตรวจทั้ง ${data.overview.draft.toLocaleString("th-TH")} รายการจะถูกปฏิเสธและไม่ถูกนำไปใช้`,
      confirmLabel: approving ? "อนุมัติทั้งหมด" : "ปฏิเสธทั้งหมด",
      tone: approving ? "default" : "danger",
    })) return;
    setBusy(approving ? "approve" : "reject");
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/translation/masters", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json() as { changed?: number; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message || `HTTP ${response.status}`);
      setMessage(`${approving ? "อนุมัติ" : "ปฏิเสธ"}แล้ว ${body.changed ?? 0} รายการ`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "บันทึกสถานะ Master ไม่สำเร็จ");
    } finally {
      setBusy(null);
    }
  }

  return <div className="grid gap-5">
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard label="Master ทั้งหมด" value={data.overview.total} icon={<ShieldCheck className="h-5 w-5" />} />
      <StatCard label="รอ Editor ตรวจ" value={data.overview.draft} icon={<Search className="h-5 w-5" />} />
      <StatCard label="Active สำหรับ Runtime" value={data.overview.active} icon={<CheckCircle2 className="h-5 w-5" />} />
    </div>
    {message ? <div className="rounded-[12px] border border-emerald-500/25 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">{message}</div> : null}
    {error ? <div role="alert" className="rounded-[12px] border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-destructive">{error}</div> : null}
    <Panel
      title="Editorial review gate"
      description="การอนุมัติจะเปิดใช้เวอร์ชันล่าสุดของทุก record ในชุดเดียวกัน และปิดเวอร์ชันเดิมของ key เดียวกัน"
      action={data.overview.draft ? <div className="flex gap-2">
        <Button type="button" variant="outline" loading={busy === "reject"} disabled={Boolean(busy)} onClick={() => review("REJECT_DRAFT_SET")}><XCircle className="h-4 w-4" />ปฏิเสธชุด Draft</Button>
        <Button type="button" loading={busy === "approve"} disabled={Boolean(busy)} onClick={() => review("APPROVE_DRAFT_SET")}><CheckCircle2 className="h-4 w-4" />อนุมัติชุด Draft</Button>
      </div> : undefined}
    >
      <p className="text-sm leading-relaxed text-muted-foreground">ก่อนอนุมัติ ควรสุ่มทดสอบ passage หลายรูปแบบและตรวจว่า Profile ไม่เพิ่ม canon ไม่เลียนสำนวนผู้เขียน และ Story Profile/Glossary รายเรื่องยังมีลำดับสูงกว่า Master เสมอ</p>
    </Panel>
    <Panel title="รายการ Master" bodyClassName="p-0">
      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(0,1fr)_260px]">
        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหา ID หรือชื่อ" aria-label="ค้นหา Master" />
        <Select value={dataset} onChange={(event) => setDataset(event.target.value)} aria-label="กรองชนิด Master">
          <option value="ALL">ทุกชนิด</option>
          {datasets.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">ชนิด</th><th className="px-4 py-3">ID</th><th className="px-4 py-3">ชื่อ</th><th className="px-4 py-3">Version</th><th className="px-4 py-3">สถานะ</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 text-xs text-muted-foreground">{row.dataset}</td><td className="px-4 py-3 font-mono text-xs font-semibold">{row.recordKey}</td><td className="max-w-xl px-4 py-3">{row.name}</td><td className="px-4 py-3 tabular-nums">{row.version}</td><td className="px-4 py-3"><StatusPill label={row.isActive ? "ACTIVE" : row.reviewStatus} tone={row.isActive ? "success" : row.reviewStatus === "REJECTED" ? "danger" : "warning"} /></td></tr>)}</tbody>
        </table>
      </div>
    </Panel>
  </div>;
}
