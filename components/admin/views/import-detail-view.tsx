import Image from "next/image";
import { ExternalLink } from "lucide-react";

import { DetailRow, Panel, StatCard } from "@/components/admin/admin-ui";
import { StatusPill } from "@/components/admin/status-pill";
import { ButtonLink } from "@/components/ui/button";
import type { AdminImportSourceDetail } from "@/services/admin-import-service";

function detailPageHref(sourceId: string, page: number) {
  return `/admin/imports/${sourceId}?page=${page}`;
}

export function ImportDetailView({ source }: { source: AdminImportSourceDetail }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="ตอนที่รับแล้ว" value={source.chapterCount} hint={`ต่อเนื่องถึงตอน ${source.lastSuccessfulChapter ?? 0}`} />
        <StatCard label="ตอนถัดไป" value={source.nextProbeChapter} hint="checkpoint ที่ Auto Run จะตรวจ" />
        <StatCard label="ภาษา" value={source.languageCount} hint={`ต้นฉบับ ${source.sourceLanguage}`} />
        <StatCard label="สถานะปก" value={source.coverStatus} hint={source.coverError ?? "อัปโหลดเข้า media storage"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <Panel title="ภาพปก" bodyClassName="p-4">
          <div className="relative mx-auto aspect-[2/3] w-full max-w-44 overflow-hidden rounded-[12px] bg-muted">
            {source.coverUrl ? <Image src={source.coverUrl} alt={`ปก ${source.title}`} fill sizes="176px" className="object-cover" priority /> : <div className="grid h-full place-items-center px-4 text-center text-sm text-muted-foreground">ยังไม่มีภาพปกที่อัปโหลดแล้ว</div>}
          </div>
          {source.coverSourceUrl ? <a href={source.coverSourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:underline">ดูภาพต้นทาง <ExternalLink className="h-3 w-3" /></a> : null}
        </Panel>

        <Panel title="ข้อมูลแหล่งนำเข้า" description="ข้อมูลนี้เป็น private staging และยังไม่เผยแพร่สู่หน้าผู้อ่าน">
          <dl>
            <DetailRow label="Provider">{source.provider}</DetailRow>
            <DetailRow label="External ID">{source.externalWorkId}</DetailRow>
            <DetailRow label="Import reference"><code className="text-xs">{source.importReference}</code></DetailRow>
            <DetailRow label="สถานะ"><StatusPill label={source.status} tone={source.status === "ready" ? "success" : source.status === "paused" ? "warning" : "danger"} /></DetailRow>
            <DetailRow label="เชื่อมกับนิยายสาธารณะ">{source.linkedNovelId ?? "ยังไม่เชื่อม"}</DetailRow>
            <DetailRow label="เพิ่มเมื่อ">{new Date(source.createdAt).toLocaleString("th-TH")}</DetailRow>
            <DetailRow label="อัปเดตล่าสุด">{new Date(source.updatedAt).toLocaleString("th-TH")}</DetailRow>
          </dl>
          <a href={source.seedUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-emphasis)] hover:underline">เปิดหน้าต้นทาง <ExternalLink className="h-4 w-4" /></a>
          {source.blockedReason ? <p className="mt-3 rounded-[10px] bg-destructive/10 p-3 text-sm text-destructive">{source.blockedReason}</p> : null}
        </Panel>
      </div>

      <Panel title="ชื่อเรื่องและเรื่องย่อตามภาษา" description="ต้นฉบับและคำแปลถูกเก็บแยกกัน">
        <div className="grid gap-3 md:grid-cols-2">
          {source.texts.map((text) => (
            <article key={text.language} className="rounded-[12px] border border-border p-4">
              <div className="mb-2 flex items-center justify-between gap-2"><strong>{text.language}</strong><StatusPill label={text.translationStatus} tone={text.textKind === "source" ? "info" : text.translationStatus === "approved" ? "success" : "warning"} /></div>
              <h3 className="font-semibold">{text.title}</h3>
              {text.synopsis ? <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-muted-foreground">{text.synopsis}</p> : <p className="mt-2 text-sm text-muted-foreground">ไม่มีเรื่องย่อ</p>}
            </article>
          ))}
        </div>
      </Panel>

      <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-[var(--sh-1)]">
        <div className="border-b border-border px-5 py-4"><h2 className="font-semibold">ตอนที่นำเข้า</h2><p className="mt-0.5 text-sm text-muted-foreground">เรียงจากตอนล่าสุด แต่ละแถวแสดงภาษา เวอร์ชัน และจำนวนตัวอักษร</p></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b border-border bg-muted/60 text-left text-xs text-muted-foreground"><th className="px-4 py-3">ตอน</th><th className="px-4 py-3">ชื่อ</th><th className="px-4 py-3">ภาษา/สถานะ</th><th className="px-4 py-3">ตัวอักษร</th><th className="px-4 py-3">ดึงเมื่อ</th><th className="px-4 py-3">ต้นทาง</th></tr></thead>
            <tbody>
              {source.chapters.items.map((chapter) => {
                const sourceText = chapter.texts.find((text) => text.textKind === "source") ?? chapter.texts[0];
                return <tr key={chapter.id} className="border-b border-border/70 align-top last:border-0">
                  <td className="tabular px-4 py-3 font-semibold">{chapter.chapterNumber.toLocaleString("th-TH")}</td>
                  <td className="px-4 py-3">{sourceText?.title ?? "—"}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{chapter.texts.map((text) => <span key={text.language} className="rounded-[7px] border border-border bg-muted px-2 py-1 text-xs">{text.language} · {text.translationStatus} · v{text.version}</span>)}</div></td>
                  <td className="tabular px-4 py-3">{chapter.texts.reduce((sum, text) => sum + text.contentLength, 0).toLocaleString("th-TH")}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{new Date(chapter.fetchedAt).toLocaleString("th-TH")}</td>
                  <td className="px-4 py-3"><a href={chapter.sourceUrl} target="_blank" rel="noreferrer" aria-label={`เปิดต้นทางตอน ${chapter.chapterNumber}`} className="inline-flex h-9 w-9 items-center justify-center rounded-[9px] hover:bg-muted"><ExternalLink className="h-4 w-4" /></a></td>
                </tr>;
              })}
              {!source.chapters.items.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">ยังไม่มีตอนที่นำเข้า</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>ทั้งหมด {source.chapters.total.toLocaleString("th-TH")} ตอน</span>
          <div className="flex items-center gap-2">
            {source.chapters.page > 1 ? <ButtonLink size="sm" variant="outline" href={detailPageHref(source.id, source.chapters.page - 1)}>ก่อนหน้า</ButtonLink> : null}
            <span>หน้า {source.chapters.page} / {source.chapters.totalPages}</span>
            {source.chapters.page < source.chapters.totalPages ? <ButtonLink size="sm" variant="outline" href={detailPageHref(source.id, source.chapters.page + 1)}>ถัดไป</ButtonLink> : null}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">หน้านี้เป็นแบบอ่านอย่างเดียว การตรวจสิทธิ์และการนำเข้าสู่ catalog สาธารณะยังเป็นขั้นตอนแยกต่างหาก</p>
    </div>
  );
}
