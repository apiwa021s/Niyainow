import Link from "next/link";
import { Eye, Pencil } from "lucide-react";

import { Panel } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import type { AdminChapterQuery, AdminChapterRow, AdminPage, ChapterStatus } from "@/services/admin-service";

const statusMeta: Record<ChapterStatus, { label: string; tone: "neutral" | "info" | "success" }> = {
  DRAFT: { label: "ฉบับร่าง", tone: "neutral" },
  SCHEDULED: { label: "ตั้งเวลา", tone: "info" },
  PUBLISHED: { label: "เผยแพร่", tone: "success" },
  UNPUBLISHED: { label: "ถอนเผยแพร่", tone: "neutral" },
  ARCHIVED: { label: "เก็บถาวร", tone: "neutral" },
};

function pageHref(query: AdminChapterQuery, page: number, basePath: string) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, page })) {
    if (value && value !== "all" && !(key === "novel" && basePath.includes("/novels/"))) params.set(key, String(value));
  }
  return `${basePath}?${params}`;
}
export function ChaptersView({
  result,
  query,
  basePath = "/admin/chapters",
  fixedNovelSlug,
}: {
  result: AdminPage<AdminChapterRow>;
  query: AdminChapterQuery;
  basePath?: string;
  fixedNovelSlug?: string;
}) {
  return (
    <div className="grid gap-4">
      <Panel bodyClassName="p-4">
        <form action={basePath} method="get" className="flex flex-wrap items-end gap-2">
          <label className="grid min-w-52 flex-1 gap-1 text-xs font-medium text-muted-foreground">ค้นหา<Input name="q" defaultValue={query.q ?? ""} placeholder="ชื่อตอน ชื่อเรื่อง หรือเลขตอน" /></label>
          <label className="grid gap-1 text-xs font-medium text-muted-foreground">สถานะ<Select name="status" defaultValue={query.status ?? "all"} className="min-w-36">
            <option value="all">ทั้งหมด</option>{Object.entries(statusMeta).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
          </Select></label>
          {!fixedNovelSlug ? <label className="grid gap-1 text-xs font-medium text-muted-foreground">Slug เรื่อง<Input name="novel" defaultValue={query.novel ?? ""} className="min-w-44" /></label> : null}
          <button className="h-11 rounded-[12px] bg-[var(--brand-primary)] px-4 text-sm font-semibold text-white">ค้นหา</button>
          <ButtonLink href={basePath} variant="outline">ล้างตัวกรอง</ButtonLink>
        </form>
      </Panel>

      <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] border-collapse text-sm">
          <caption className="sr-only">รายการตอนนิยาย</caption>
          <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground">
            <th className="px-4 py-3">ตอน</th><th className="px-4 py-3">เรื่อง</th><th className="px-4 py-3">ลำดับ</th><th className="px-4 py-3">สถานะ</th><th className="px-4 py-3">คำ</th><th className="px-4 py-3">อัปเดต</th><th className="px-4 py-3"><span className="sr-only">คำสั่ง</span></th>
          </tr></thead>
          <tbody>
            {result.items.map((chapter) => (
              <tr key={chapter.id} className="border-b border-border/70 last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3"><Link href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.chapterNumber}`} className="font-semibold hover:underline">{chapter.chapterNumber}: {chapter.title}</Link></td>
                <td className="px-4 py-3 text-muted-foreground">{chapter.novelTitle}</td>
                <td className="tabular px-4 py-3">{chapter.sortOrder}</td>
                <td className="px-4 py-3"><StatusPill {...statusMeta[chapter.status]} /></td>
                <td className="tabular px-4 py-3">{chapter.wordCount.toLocaleString("th-TH")}</td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(chapter.updatedAt).toLocaleString("th-TH")}</td>
                <td className="px-4 py-3"><div className="flex justify-end gap-1">
                  <Link href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.chapterNumber}`} aria-label="แก้ไขตอน" className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><Pencil className="h-4 w-4" /></Link>
                  <Link href={`/admin/novels/${chapter.novelSlug}/chapters/${chapter.chapterNumber}/preview`} aria-label="ดูตัวอย่างตอน" className="grid h-9 w-9 place-items-center rounded-[9px] hover:bg-muted"><Eye className="h-4 w-4" /></Link>
                </div></td>
              </tr>
            ))}
            {!result.items.length ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">ไม่พบตอนที่ตรงกับตัวกรอง</td></tr> : null}
          </tbody>
        </table></div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>ทั้งหมด {result.total.toLocaleString("th-TH")} ตอน</span><div className="flex items-center gap-2">
            {result.page > 1 ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page - 1, basePath)}>ก่อนหน้า</ButtonLink> : null}
            <span>หน้า {result.page} / {result.totalPages}</span>
            {result.page < result.totalPages ? <ButtonLink size="sm" variant="outline" href={pageHref(query, result.page + 1, basePath)}>ถัดไป</ButtonLink> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
