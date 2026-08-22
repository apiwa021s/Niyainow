import type { Metadata } from "next";
import { CalendarClock, FileText, Flame, PenLine, Plus } from "lucide-react";
import { notFound } from "next/navigation";

import { EmptyState, StatusPill, StudioPageHeader, StudioRowLink } from "@/components/studio/studio-ui";
import { StoryActions } from "@/components/studio/story/story-actions";
import { ButtonLink } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/dal";
import { getWriterStoryBySlug, listWriterChapters } from "@/services/studio-service";

export const metadata: Metadata = { title: "จัดการผลงาน" };

const chapterStatus = {
  DRAFT: { label: "ฉบับร่าง", dot: "bg-(--text-tertiary)" },
  SCHEDULED: { label: "ตั้งเวลา", dot: "bg-sky-500" },
  PUBLISHED: { label: "เผยแพร่แล้ว", dot: "bg-emerald-500" },
  UNPUBLISHED: { label: "ถอนเผยแพร่", dot: "bg-amber-500" },
  ARCHIVED: { label: "เก็บถาวร", dot: "bg-(--text-tertiary)" },
} as const;

export default async function StudioWorkDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireActiveUser(`/studio/works/${slug}`);
  let story;
  try {
    story = await getWriterStoryBySlug(user.id, slug);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "STORY_NOT_FOUND") notFound();
    throw error;
  }
  const chapters = await listWriterChapters(user.id, story.id);

  return (
    <div className="grid gap-5">
      <StudioPageHeader eyebrow="MY WORKS / STORY" title={story.title} description={story.tagline || "จัดการตอน สถานะการเผยแพร่ และการเข้าถึงของผลงานนี้"} action={<ButtonLink href={`/studio/works/${story.slug}/chapters/new`}><Plus className="h-4 w-4" aria-hidden />เขียนตอนใหม่</ButtonLink>} />
      <section className="grid gap-3 rounded-[8px] border border-border bg-card p-4 sm:grid-cols-3 sm:p-5">
        <div><p className="text-xs text-(--text-tertiary)">สถานะเรื่อง</p><p className="mt-1 font-semibold">{story.status === "COMPLETED" ? "จบแล้ว" : story.status === "HIATUS" ? "พักการเขียน" : "กำลังเขียน"}</p></div>
        <div><p className="text-xs text-(--text-tertiary)">การเผยแพร่</p><p className="mt-1 font-semibold">{story.publicationStatus === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}</p></div>
        <div><p className="text-xs text-(--text-tertiary)">ระดับเนื้อหา</p><p className="mt-1 inline-flex items-center gap-1 font-semibold"><Flame className="h-4 w-4 text-brand-primary" aria-hidden />Heat {story.heatLevel ?? "-"}</p></div>
      </section>
      <StoryActions storyId={story.id} published={story.publicationStatus === "PUBLISHED"} status={story.status} />
      {chapters.length === 0 ? (
        <EmptyState icon={PenLine} title="เรื่องของคุณพร้อมแล้ว" description="เริ่มเขียนตอนแรก ระบบจะบันทึกฉบับร่างและตรวจ version เพื่อป้องกันการเขียนทับ" action={<ButtonLink href={`/studio/works/${story.slug}/chapters/new`}>เขียนตอนแรก</ButtonLink>} />
      ) : (
        <section className="overflow-hidden rounded-[8px] border border-border bg-card">
          <div className="border-b border-border px-4 py-3 sm:px-5"><h2 className="font-semibold">ตอนทั้งหมด</h2><p className="mt-1 text-xs text-(--text-tertiary)">{chapters.length} ตอน</p></div>
          <ul className="divide-y divide-border">
            {chapters.map((chapter) => {
              const status = chapterStatus[chapter.status];
              return (
                <li key={chapter.id}>
                  <StudioRowLink href={`/studio/works/${story.slug}/chapters/${chapter.id}/edit`}>
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[6px] bg-muted text-(--text-secondary)"><FileText className="h-4 w-4" aria-hidden /></span>
                      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">EP.{chapter.chapterNumber} · {chapter.title}</p><StatusPill label={status.label} dot={status.dot} /></div><p className="mt-1 text-xs text-(--text-tertiary)">{chapter.accessMode === "free" ? "อ่านฟรี" : chapter.accessMode === "paid" ? `${chapter.coinPrice} Coins` : chapter.accessMode === "early_access" ? "สมาชิกอ่านก่อน" : "สมาชิกเท่านั้น"} · Version {chapter.version}</p></div>
                      {chapter.scheduledAt ? <CalendarClock className="h-4 w-4 shrink-0 text-sky-500" aria-label="ตั้งเวลาเผยแพร่" /> : null}
                    </div>
                  </StudioRowLink>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
