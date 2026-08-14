import Link from "next/link";
import { ExternalLink, FileStack, Pencil } from "lucide-react";

import { Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import type { AdminNovelQuery, AdminNovelRow, AdminPage, AdminReferenceData, PublicationStatus } from "@/services/admin-service";

const statusLabels: Record<PublicationStatus, { label: string; tone: "neutral" | "warning" | "info" | "success" }> = {
  DRAFT: { label: "ฉบับร่าง", tone: "neutral" },
  IN_REVIEW: { label: "รอตรวจ", tone: "warning" },
  SCHEDULED: { label: "ตั้งเวลา", tone: "info" },
  PUBLISHED: { label: "เผยแพร่", tone: "success" },
  ARCHIVED: { label: "เก็บถาวร", tone: "neutral" },
};

function pageHref(query: AdminNovelQuery, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value && value !== "all") params.set(key, String(value));
  }
  return `/admin/novels?${params}`;
}
export function NovelsView({
  result,
  query,
  references,
}: {
  result: AdminPage<AdminNovelRow>;
  query: AdminNovelQuery;
  references: AdminReferenceData;
}) {
  return (
    <div className="grid gap-4">
      <Panel bodyClassName="p-4">
        <form action="/admin/novels" method="get" className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-52 flex-1 gap-1 text-xs font-medium text-muted-foreground">
            ค้นหา
            <Input name="q" defaultValue={query.q ?? ""} placeholder="ชื่อเรื่อง ผู้แต่ง หรือ slug" />
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            สถานะ
            <Select name="status" defaultValue={query.status ?? "all"} className="min-w-36">
              <option value="all">ทั้งหมด</option>
              {Object.entries(statusLabels).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            แนว
            <Select name="genre" defaultValue={query.genre ?? "all"} className="min-w-36">
              <option value="all">ทุกแนว</option>
              {references.genres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">
            เรียงตาม
            <Select name="sort" defaultValue={query.sort ?? "updated"} className="min-w-36">
              <option value="updated">อัปเดตล่าสุด</option>
              <option value="views">ยอดอ่าน</option>
              <option value="chapters">จำนวนตอน</option>
              <option value="title">ชื่อเรื่อง</option>
            </Select>
          </label>
          <button className="h-11 rounded-[12px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
          <ButtonLink href="/admin/novels" variant="outline">ล้างตัวกรอง</ButtonLink>
        </form>
      </Panel>

      <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <caption className="sr-only">รายการนิยายในระบบ</caption>
            <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">เรื่อง</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">ตอน</th>
              <th className="px-4 py-3">ยอดอ่าน</th><th className="px-4 py-3">อัปเดต</th><th className="px-4 py-3"><span className="sr-only">คำสั่ง</span></th>
            </tr></thead>
            <tbody>
              {result.items.map((novel) => (
                <tr key={novel.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/novels/${novel.slug}`} title={novel.title} className="block max-w-[28rem] truncate font-semibold hover:underline">{novel.title}</Link>
                    <p className="mt-0.5 max-w-[28rem] truncate text-xs text-muted-foreground">{novel.authors.join(", ") || "ไม่ระบุผู้แต่ง"} · {novel.genres.map((genre) => genre.name).join(", ")}</p>
                  </td>
                  <td className="px-4 py-3"><StatusPill {...statusLabels[novel.publicationStatus]} /></td>
                  <td className="tabular px-4 py-3">{novel.publishedChapters.toLocaleString("th-TH")} / {novel.totalChapters.toLocaleString("th-TH")}</td>
                  <td className="tabular px-4 py-3">{novel.viewCount.toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(novel.updatedAt).toLocaleString("th-TH")}</td>
                  <td className="px-4 py-3"><div className="flex justify-end gap-1">
                    <Link href={`/admin/novels/${novel.slug}`} aria-label={`แก้ไข ${novel.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><Pencil className="h-4 w-4" /></Link>
                    <Link href={`/admin/novels/${novel.slug}/chapters`} aria-label={`จัดการตอน ${novel.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><FileStack className="h-4 w-4" /></Link>
                    {novel.publicationStatus === "PUBLISHED" ? <Link href={`/novel/${novel.slug}`} aria-label={`ดูหน้าเผยแพร่ ${novel.title}`} className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><ExternalLink className="h-4 w-4" /></Link> : null}
                  </div></td>
                </tr>
              ))}
              {!result.items.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">ไม่พบข้อมูลที่ตรงกับตัวกรอง</td></tr> : null}
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
