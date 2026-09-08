import Image from "next/image";
import Link from "next/link";
import { Eye } from "lucide-react";

import { Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import type { AdminImportQuery, AdminImportSourceRow } from "@/services/admin-import-service";

type Result = {
  items: AdminImportSourceRow[];
  page: number;
  total: number;
  totalPages: number;
};

const sourceStatus = {
  ready: { label: "พร้อมรับตอน", tone: "success" as const },
  paused: { label: "พักชั่วคราว", tone: "warning" as const },
  blocked: { label: "ถูกระงับ", tone: "danger" as const },
  error: { label: "ผิดพลาด", tone: "danger" as const },
};

const coverStatus = {
  missing: { label: "ไม่มีปก", tone: "neutral" as const },
  pending: { label: "กำลังอัปโหลด", tone: "info" as const },
  ready: { label: "ปกพร้อม", tone: "success" as const },
  error: { label: "ปกผิดพลาด", tone: "danger" as const },
};

function pageHref(query: AdminImportQuery, page: number) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", String(query.q));
  if (query.status && query.status !== "all") params.set("status", String(query.status));
  if (query.cover && query.cover !== "all") params.set("cover", String(query.cover));
  params.set("page", String(page));
  return `/admin/imports?${params}`;
}

export function ImportsView({ result, query }: { result: Result; query: AdminImportQuery }) {
  return (
    <div className="grid gap-4">
      <Panel bodyClassName="p-4">
        <form action="/admin/imports" method="get" className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-56 flex-1 gap-1 text-xs font-medium text-muted-foreground">
            ค้นหา
            <Input name="q" defaultValue={query.q ?? ""} placeholder="ชื่อเรื่อง, provider หรือ external ID" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            สถานะ
            <Select name="status" defaultValue={query.status ?? "all"} className="min-w-40">
              <option value="all">ทั้งหมด</option>
              {Object.entries(sourceStatus).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            ภาพปก
            <Select name="cover" defaultValue={query.cover ?? "all"} className="min-w-40">
              <option value="all">ทั้งหมด</option>
              {Object.entries(coverStatus).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </Select>
          </label>
          <button className="h-11 rounded-[12px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
          <ButtonLink href="/admin/imports" variant="outline">ล้างตัวกรอง</ButtonLink>
        </form>
      </Panel>

      <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <caption className="sr-only">เรื่องที่รับเข้าจาก Novel Import API</caption>
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">เรื่อง</th>
                <th className="px-4 py-3">แหล่งข้อมูล</th>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">ตอน</th>
                <th className="px-4 py-3">ภาษา</th>
                <th className="px-4 py-3">ภาพปก</th>
                <th className="px-4 py-3">อัปเดต</th>
                <th className="px-4 py-3"><span className="sr-only">ดูรายละเอียด</span></th>
              </tr>
            </thead>
            <tbody>
              {result.items.map((source) => {
                const state = sourceStatus[source.status as keyof typeof sourceStatus] ?? sourceStatus.error;
                const artwork = coverStatus[source.coverStatus as keyof typeof coverStatus] ?? coverStatus.error;
                return (
                  <tr key={source.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[6px] bg-muted">
                          {source.coverUrl ? <Image src={source.coverUrl} alt="" fill sizes="40px" className="object-cover" /> : null}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/imports/${source.id}`} className="font-semibold hover:underline">{source.title}</Link>
                          <p className="mt-0.5 max-w-72 truncate text-xs text-muted-foreground">{source.importReference}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><p className="font-medium">{source.provider}</p><p className="text-xs text-muted-foreground">ID {source.externalWorkId}</p></td>
                    <td className="px-4 py-3"><StatusPill {...state} /></td>
                    <td className="tabular px-4 py-3"><p className="font-semibold">{source.chapterCount.toLocaleString("th-TH")}</p><p className="text-xs text-muted-foreground">ต่อเนื่อง {source.lastSuccessfulChapter?.toLocaleString("th-TH") ?? "0"} · ถัดไป {source.nextProbeChapter.toLocaleString("th-TH")}</p></td>
                    <td className="tabular px-4 py-3">{source.languageCount.toLocaleString("th-TH")} <span className="text-xs text-muted-foreground">({source.sourceLanguage})</span></td>
                    <td className="px-4 py-3"><StatusPill {...artwork} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(source.updatedAt).toLocaleString("th-TH")}</td>
                    <td className="px-4 py-3"><Link href={`/admin/imports/${source.id}`} aria-label={`ดู ${source.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><Eye className="h-4 w-4" /></Link></td>
                  </tr>
                );
              })}
              {!result.items.length ? <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">ยังไม่มีเรื่องที่ตรงกับตัวกรอง</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>ทั้งหมด {result.total.toLocaleString("th-TH")} เรื่อง</span>
          <div className="flex items-center gap-2">
            {result.page > 1 ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page - 1)}>ก่อนหน้า</ButtonLink> : null}
            <span>หน้า {result.page} / {result.totalPages}</span>
            {result.page < result.totalPages ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page + 1)}>ถัดไป</ButtonLink> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
