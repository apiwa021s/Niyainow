import { Bell, ChevronLeft, ChevronRight, List, Lock, Zap } from "lucide-react";
import Link from "next/link";

import { FollowButton } from "@/components/interactive/novel-actions";
import type { ChapterSummary, Novel } from "@/types/novel";

function BrandDivider() {
  return (
    <div aria-hidden className="flex justify-center">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-current/6 text-[var(--reader-accent)]">
        <Zap className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

export function ChapterEnd({
  novel,
  chapter,
  chapterPosition,
  totalChapters,
  previous,
  next,
  initialFollowing,
  onNavigateChapter,
}: {
  novel: Novel;
  chapter: ChapterSummary;
  chapterPosition?: number;
  totalChapters?: number;
  previous?: ChapterSummary;
  next?: ChapterSummary;
  initialFollowing?: boolean;
  onNavigateChapter?: (chapterNumber: number) => void;
}) {
  return (
    <footer className="mt-12 flex flex-col gap-6">
      <BrandDivider />

      <div className="text-center">
        <p className="text-lg font-semibold">จบตอน {chapter.number}</p>
        {chapterPosition !== undefined && totalChapters !== undefined ? (
          <p className="mt-1 text-xs opacity-65">
            ความคืบหน้าในเรื่อง: ลำดับที่ {chapterPosition.toLocaleString("th-TH")} จาก {totalChapters.toLocaleString("th-TH")} ตอน
          </p>
        ) : null}
      </div>

      {next ? (
        next.locked ? (
          <div className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-[8px] border border-current/15 px-5 text-center text-sm font-semibold opacity-75">
            <Lock className="h-4 w-4 shrink-0" />
            ตอนที่ {next.number} ยังไม่เปิดให้อ่านบนระบบนี้
          </div>
        ) : (
          <Link
            href={`/novel/${novel.slug}/chapter/${next.number}`}
            onClick={() => onNavigateChapter?.(next.number)}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[8px] bg-[var(--reader-action)] px-5 text-center text-base font-semibold text-white shadow-[var(--sh-brand)]"
          >
            <span className="line-clamp-2">ตอนถัดไป · {next.title}</span>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </Link>
        )
      ) : (
        <div className="flex flex-col gap-3 rounded-[8px] bg-current/6 p-4 text-center">
          <p className="text-sm font-semibold">คุณอ่านถึงตอนล่าสุดแล้ว</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <FollowButton slug={novel.slug} initialActive={initialFollowing} />
            <Link href={`/novel/${novel.slug}`} className="inline-flex min-h-11 items-center rounded-[6px] border border-current/15 px-4 text-sm font-semibold hover:bg-current/8">
              กลับหน้ารายละเอียด
            </Link>
          </div>
          <p className="flex items-center justify-center gap-1 text-xs opacity-65">
            <Bell className="h-3.5 w-3.5" /> ติดตามเพื่อดูตอนใหม่ในส่วนอัปเดตบนหน้าแรก
          </p>
        </div>
      )}

      <nav aria-label="ทางเลือกเมื่อจบตอน" className={`grid gap-2 ${previous ? "grid-cols-2" : "grid-cols-1"}`}>
        {previous ? (
          <Link
            href={`/novel/${novel.slug}/chapter/${previous.number}`}
            onClick={() => onNavigateChapter?.(previous.number)}
            className="flex min-h-12 items-center justify-center gap-1 rounded-[8px] border border-current/15 px-3 text-sm font-semibold hover:bg-current/8"
          >
            <ChevronLeft className="h-4 w-4" /> ตอนก่อน
          </Link>
        ) : null}
        <Link
          href={`/novel/${novel.slug}/chapters`}
          className="flex min-h-12 items-center justify-center gap-2 rounded-[8px] border border-current/15 px-3 text-sm font-semibold hover:bg-current/8"
        >
          <List className="h-4 w-4" /> สารบัญ
        </Link>
      </nav>
    </footer>
  );
}
