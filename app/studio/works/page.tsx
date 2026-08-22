import type { Metadata } from "next";
import { BookMarked, FilePenLine, Flame, Plus } from "lucide-react";

import { EmptyState, StatusPill, StudioPageHeader, StudioRowLink } from "@/components/studio/studio-ui";
import { ButtonLink } from "@/components/ui/button";
import { requireActiveUser } from "@/lib/auth/dal";
import { listWriterStories } from "@/services/studio-service";

export const metadata: Metadata = { title: "ผลงานของฉัน" };

const statusMeta = {
  DRAFT: { label: "ฉบับร่าง", dot: "bg-(--text-tertiary)" },
  IN_REVIEW: { label: "รอตรวจ", dot: "bg-amber-500" },
  SCHEDULED: { label: "ตั้งเวลา", dot: "bg-sky-500" },
  PUBLISHED: { label: "เผยแพร่แล้ว", dot: "bg-emerald-500" },
  ARCHIVED: { label: "เก็บถาวร", dot: "bg-(--text-tertiary)" },
} as const;

const dateTime = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short" });

export default async function StudioWorksPage() {
  const user = await requireActiveUser("/studio/works");
  let stories;
  try {
    stories = await listWriterStories(user.id);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "WRITER_PROFILE_REQUIRED") {
      return (
        <>
          <StudioPageHeader eyebrow="MY WORKS" title="ผลงานของฉัน" description="สร้างโปรไฟล์นักเขียนก่อนเริ่มผลงานแรก" />
          <EmptyState icon={FilePenLine} title="ยังไม่มีโปรไฟล์นักเขียน" description="ตั้งนามปากกาและ Username เพื่อเปิดพื้นที่นักเขียนของคุณ" action={<ButtonLink href="/studio/profile">สร้างโปรไฟล์นักเขียน</ButtonLink>} />
        </>
      );
    }
    throw error;
  }

  return (
    <>
      <StudioPageHeader
        eyebrow="MY WORKS"
        title="ผลงานของฉัน"
        description="จัดการเรื่องทั้งหมดของคุณ ตั้งแต่ฉบับร่างจนถึงเรื่องที่เผยแพร่แล้ว"
        action={<ButtonLink href="/studio/works/new"><Plus aria-hidden className="h-4 w-4" />เพิ่มผลงานใหม่</ButtonLink>}
      />

      {stories.length === 0 ? (
        <EmptyState icon={BookMarked} title="เริ่มผลงานแรกของคุณ" description="สร้างเรื่องเป็นฉบับร่างก่อน แล้วค่อยเพิ่มตอนและเลือกเวลาเผยแพร่" action={<ButtonLink href="/studio/works/new"><Plus className="h-4 w-4" aria-hidden />สร้างเรื่องใหม่</ButtonLink>} />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" aria-label="สรุปสถานะผลงาน">
            <span className="inline-flex min-h-10 items-center rounded-[6px] bg-[var(--brand-primary)] px-3 text-sm font-semibold text-white">ทั้งหมด {stories.length}</span>
            <span className="inline-flex min-h-10 items-center rounded-[6px] border border-border bg-card px-3 text-sm text-(--text-secondary)">เผยแพร่แล้ว {stories.filter((story) => story.publishStatus === "PUBLISHED").length}</span>
            <span className="inline-flex min-h-10 items-center rounded-[6px] border border-border bg-card px-3 text-sm text-(--text-secondary)">ฉบับร่าง {stories.filter((story) => story.publishStatus === "DRAFT").length}</span>
          </div>
          <ul className="mt-4 grid gap-3">
            {stories.map((story) => {
              const status = statusMeta[story.publishStatus];
              return (
                <li key={story.id} className="overflow-hidden rounded-[8px] border border-border bg-card">
                  <StudioRowLink href={`/studio/works/${story.slug}`}>
                    <div className="flex gap-4">
                      <span aria-hidden className="grid h-24 w-16 shrink-0 place-items-center rounded-[6px] bg-accent-subtle text-brand-primary"><BookMarked className="h-6 w-6" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="min-w-0 truncate font-semibold">{story.title}</h2>
                          <StatusPill label={status.label} dot={status.dot} />
                        </div>
                        {story.tagline ? <p className="mt-1 line-clamp-2 text-sm text-(--text-secondary)">{story.tagline}</p> : null}
                        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--text-tertiary)">
                          <span>แก้ไข {dateTime.format(story.updatedAt)}</span>
                          {story.heatLevel ? <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" aria-hidden />Heat {story.heatLevel}</span> : null}
                          <span>{story.status === "COMPLETED" ? "จบแล้ว" : story.status === "HIATUS" ? "พักการเขียน" : "กำลังเขียน"}</span>
                        </div>
                      </div>
                    </div>
                  </StudioRowLink>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
