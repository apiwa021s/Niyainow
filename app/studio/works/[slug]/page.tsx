import { ArrowLeft, BookMarked, Coins, Eye, ExternalLink, Pencil, Plus, Unlock, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  baht,
  chapterStatusLabels,
  studioChapters,
  studioWorks,
  whole,
  workStatusLabels,
} from "@/components/studio/mock-data";
import { StatTile, StatusPill, StudioPanel } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";

export default async function StudioWorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const work = studioWorks.find((item) => item.slug === slug);
  if (!work) notFound();

  const status = workStatusLabels[work.status];

  return (
    <>
      <Link
        href="/studio/works"
        className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-(--text-secondary) hover:text-[var(--brand-emphasis)]"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        กลับไปผลงานของฉัน
      </Link>

      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="grid h-36 w-24 shrink-0 place-items-center rounded-[8px] bg-accent-subtle text-brand-primary"
        >
          <BookMarked className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill label={status.label} dot={status.dot} />
            <span className="text-xs text-(--text-tertiary)">แก้ไขล่าสุด {work.updatedAt}</span>
          </div>
          <h1 className="mt-2 text-h1 font-semibold">{work.title}</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">
            {whole.format(work.chapters)} ตอนที่เผยแพร่แล้ว
            {work.drafts > 0 ? ` · ฉบับร่างค้างอยู่ ${work.drafts} ตอน` : ""}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href={`/studio/works/${work.slug}/chapters/new`} variant="primary">
              <Plus aria-hidden className="h-4 w-4" />
              เพิ่มตอนใหม่
            </ButtonLink>
            <ButtonLink href={`/studio/works/${work.slug}`} variant="outline">
              <Pencil aria-hidden className="h-4 w-4" />
              แก้ไขข้อมูลเรื่อง
            </ButtonLink>
            <ButtonLink href={`/novel/${work.slug}`} variant="ghost">
              <ExternalLink aria-hidden className="h-4 w-4" />
              ดูหน้าเรื่องที่ผู้อ่านเห็น
            </ButtonLink>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon={Coins} label="รายได้งวดนี้" value={baht.format(work.earnings)} unit="บาท" />
        <StatTile icon={Unlock} label="การปลดล็อก" value={whole.format(work.unlocks)} unit="ครั้ง" />
        <StatTile icon={Eye} label="ยอดอ่านสะสม" value={whole.format(work.reads)} unit="ครั้ง" />
        <StatTile icon={Users} label="ผู้ติดตาม" value={whole.format(work.followers)} unit="คน" />
      </div>

      <StudioPanel
        className="mt-4"
        title="รายการตอน"
        description="เรียงจากตอนที่เคลื่อนไหวล่าสุด ตอนที่เป็นร่างและตั้งเวลาไว้จะยังไม่มีใครเห็น"
        action={
          <ButtonLink href={`/studio/works/${work.slug}/chapters/new`} variant="outline" size="sm">
            <Plus aria-hidden className="h-4 w-4" />
            เพิ่มตอน
          </ButtonLink>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-(--text-tertiary)">
                <th scope="col" className="px-5 py-3 font-medium">ตอน</th>
                <th scope="col" className="px-5 py-3 font-medium">สถานะ</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">ราคา</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">ปลดล็อก</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">จำนวนคำ</th>
                <th scope="col" className="px-5 py-3 font-medium">อัปเดต</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">การจัดการ</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {studioChapters.map((chapter) => {
                const chapterStatus = chapterStatusLabels[chapter.status];
                return (
                  <tr key={chapter.number} className="transition-colors duration-[var(--dur-fast)] hover:bg-muted/50">
                    <td className="px-5 py-3.5">
                      <p className="font-medium">
                        <span className="text-(--text-tertiary) tabular-nums">ตอนที่ {chapter.number}</span> · {chapter.title}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusPill label={chapterStatus.label} dot={chapterStatus.dot} />
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">
                      {chapter.price === null ? <span className="text-(--text-tertiary)">—</span> : `${chapter.price} เหรียญ`}
                    </td>
                    <td className="px-5 py-3.5 text-right tabular-nums">{whole.format(chapter.unlocks)}</td>
                    <td className="px-5 py-3.5 text-right tabular-nums text-(--text-secondary)">{whole.format(chapter.words)}</td>
                    <td className="px-5 py-3.5 text-xs text-(--text-tertiary)">{chapter.updatedAt}</td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/studio/works/${work.slug}/chapters/new`}
                        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[var(--brand-emphasis)] underline-offset-4 hover:underline"
                      >
                        <Pencil aria-hidden className="h-3.5 w-3.5" />
                        แก้ไข
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </StudioPanel>
    </>
  );
}
